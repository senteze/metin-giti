import { App, TFile, normalizePath } from 'obsidian';
import {
	DocHistoryMeta,
	FileNamingMode,
	IndexMap,
	SaveVersionOptions,
	SaveVersionResult,
	VersionMeta,
} from '../types';
import { formatDateTimeLabel } from '../utils/date';
import { computeContentHash, generateId } from '../utils/hash';

const ROOT_DIR = '.metin-giti';
const INDEX_FILE = `${ROOT_DIR}/index.json`;
const HISTORY_DIR = `${ROOT_DIR}/history`;
const MAX_AUTO_VERSIONS = 30;

export class VersionStore {
	private readonly app: App;
	private queue: Promise<void> = Promise.resolve();

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Ensures the base .metin-giti directory structure and index.json exist.
	 */
	async initialize(): Promise<void> {
		await this.enqueue(async () => {
			await this.ensureBaseStructure();
		});
	}

	/**
	 * Reads the per-file namingMode from meta.json, falling back to the given default or 'date'.
	 */
	async getFileNamingMode(
		file: TFile,
		fallback: FileNamingMode = 'date',
	): Promise<FileNamingMode> {
		return this.enqueue(async () => {
			const index = await this.readIndex();
			const docId = index[file.path];
			if (!docId) {
				return fallback;
			}
			const meta = await this.readDocMeta(docId, file.path);
			if (meta.namingMode === 'date' || meta.namingMode === 'sequence') {
				return meta.namingMode;
			}
			return fallback;
		});
	}

	/**
	 * Persists the per-file namingMode preference into the file's meta.json.
	 */
	async setFileNamingMode(
		file: TFile,
		namingMode: FileNamingMode,
	): Promise<void> {
		if (file.extension.toLowerCase() !== 'md') {
			return;
		}

		await this.enqueue(async () => {
			await this.ensureBaseStructure();
			const index = await this.readIndex();

			let docId = index[file.path];
			if (!docId) {
				docId = generateId('doc');
				index[file.path] = docId;
				await this.writeIndex(index);
			}

			const docDir = this.getDocDir(docId);
			await this.ensureDir(docDir);

			const meta = await this.readDocMeta(docId, file.path);
			meta.filePath = file.path;
			meta.namingMode = namingMode;
			await this.writeDocMeta(docId, meta);
		});
	}

	/**
	 * Computes the next default label for a file based on the specified naming mode.
	 */
	async getDefaultLabel(
		file: TFile,
		namingMode: FileNamingMode,
	): Promise<string> {
		if (namingMode === 'date') {
			return formatDateTimeLabel(new Date());
		}

		return this.enqueue(async () => {
			const index = await this.readIndex();
			const docId = index[file.path];
			if (!docId) {
				return 'v1';
			}
			const meta = await this.readDocMeta(docId, file.path);
			return this.computeSequentialLabel(meta);
		});
	}

	/**
	 * Saves a snapshot of the given Markdown file if its content changed since the latest version.
	 */
	async saveVersion(
		file: TFile,
		options: SaveVersionOptions,
	): Promise<SaveVersionResult> {
		if (file.extension.toLowerCase() !== 'md') {
			return { saved: false, reason: 'unsupported' };
		}

		return this.enqueue(async () => {
			await this.ensureBaseStructure();

			const content = await this.app.vault.read(file);
			const hash = await computeContentHash(content);
			const index = await this.readIndex();

			let docId = index[file.path];
			if (!docId) {
				docId = generateId('doc');
				index[file.path] = docId;
				await this.writeIndex(index);
			}

			const docDir = this.getDocDir(docId);
			await this.ensureDir(docDir);

			const meta = await this.readDocMeta(docId, file.path);
			const latest = meta.versions[0];
			if (latest && latest.hash === hash) {
				return { saved: false, reason: 'duplicate' };
			}

			const now = new Date();
			const versionId = `v_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
			const effectiveMode: FileNamingMode =
				meta.namingMode ?? options.namingMode ?? 'date';
			const trimmedLabel = options.label?.trim();
			const label =
				trimmedLabel && trimmedLabel.length > 0
					? trimmedLabel
					: this.resolveDefaultLabel(meta, effectiveMode, now);

			const versionMeta: VersionMeta = {
				id: versionId,
				kind: options.kind,
				label,
				description: options.description?.trim() ?? '',
				createdAt: now.toISOString(),
				hash,
				size: content.length,
			};

			const snapshotPath = this.getSnapshotPath(docId, versionId);
			await this.app.vault.adapter.write(snapshotPath, content);

			meta.filePath = file.path;
			meta.versions.unshift(versionMeta);

			await this.pruneAutoVersions(docId, meta);
			await this.writeDocMeta(docId, meta);

			return { saved: true, version: versionMeta };
		});
	}

	/**
	 * Updates index.json and doc metadata when a tracked file is renamed or moved.
	 */
	async handleRename(oldPath: string, newPath: string): Promise<void> {
		await this.enqueue(async () => {
			await this.ensureBaseStructure();
			const index = await this.readIndex();
			const docId = index[oldPath];
			if (!docId) {
				return;
			}

			delete index[oldPath];
			index[newPath] = docId;
			await this.writeIndex(index);

			const metaPath = this.getMetaPath(docId);
			if (await this.app.vault.adapter.exists(metaPath)) {
				const meta = await this.readDocMeta(docId, newPath);
				meta.filePath = newPath;
				await this.writeDocMeta(docId, meta);
			}
		});
	}

	/**
	 * Removes a deleted file's path mapping from index.json.
	 */
	async handleDelete(filePath: string): Promise<void> {
		await this.enqueue(async () => {
			await this.ensureBaseStructure();
			const index = await this.readIndex();
			if (!(filePath in index)) {
				return;
			}

			delete index[filePath];
			await this.writeIndex(index);
		});
	}

	private resolveDefaultLabel(
		meta: DocHistoryMeta,
		namingMode: FileNamingMode,
		now: Date,
	): string {
		if (namingMode === 'sequence') {
			return this.computeSequentialLabel(meta);
		}
		return formatDateTimeLabel(now);
	}

	private computeSequentialLabel(meta: DocHistoryMeta): string {
		const manualCount = meta.versions.filter(
			(version) => version.kind === 'manual',
		).length;
		return `v${manualCount + 1}`;
	}

	private enqueue<T>(task: () => Promise<T>): Promise<T> {
		const run = this.queue.then(task, task);
		this.queue = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	private async ensureBaseStructure(): Promise<void> {
		await this.ensureDir(ROOT_DIR);
		await this.ensureDir(HISTORY_DIR);
		const indexPath = normalizePath(INDEX_FILE);
		if (!(await this.app.vault.adapter.exists(indexPath))) {
			await this.app.vault.adapter.write(indexPath, '{}');
		}
	}

	private async ensureDir(dirPath: string): Promise<void> {
		const normalized = normalizePath(dirPath);
		if (!(await this.app.vault.adapter.exists(normalized))) {
			await this.app.vault.adapter.mkdir(normalized);
		}
	}

	private async readIndex(): Promise<IndexMap> {
		const indexPath = normalizePath(INDEX_FILE);
		if (!(await this.app.vault.adapter.exists(indexPath))) {
			return {};
		}
		try {
			const raw = await this.app.vault.adapter.read(indexPath);
			const parsed: unknown = JSON.parse(raw);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as IndexMap;
			}
		} catch {
			// Fallback to empty index if file is corrupted
		}
		return {};
	}

	private async writeIndex(index: IndexMap): Promise<void> {
		const indexPath = normalizePath(INDEX_FILE);
		await this.app.vault.adapter.write(
			indexPath,
			JSON.stringify(index, null, 2),
		);
	}

	private async readDocMeta(
		docId: string,
		filePath: string,
	): Promise<DocHistoryMeta> {
		const metaPath = this.getMetaPath(docId);
		if (await this.app.vault.adapter.exists(metaPath)) {
			try {
				const raw = await this.app.vault.adapter.read(metaPath);
				const parsed = JSON.parse(raw) as Partial<DocHistoryMeta>;
				if (
					parsed &&
					typeof parsed === 'object' &&
					Array.isArray(parsed.versions)
				) {
					return {
						docId,
						filePath: parsed.filePath ?? filePath,
						namingMode: parsed.namingMode,
						versions: parsed.versions,
					};
				}
			} catch {
				// Fallback to fresh metadata if unreadable
			}
		}

		return {
			docId,
			filePath,
			versions: [],
		};
	}

	private async writeDocMeta(
		docId: string,
		meta: DocHistoryMeta,
	): Promise<void> {
		const metaPath = this.getMetaPath(docId);
		await this.app.vault.adapter.write(
			metaPath,
			JSON.stringify(meta, null, 2),
		);
	}

	private async pruneAutoVersions(
		docId: string,
		meta: DocHistoryMeta,
	): Promise<void> {
		let autoCount = 0;
		const kept: VersionMeta[] = [];
		const removed: VersionMeta[] = [];

		for (const version of meta.versions) {
			if (version.kind === 'manual') {
				kept.push(version);
				continue;
			}

			autoCount += 1;
			if (autoCount <= MAX_AUTO_VERSIONS) {
				kept.push(version);
			} else {
				removed.push(version);
			}
		}

		if (removed.length === 0) {
			return;
		}

		meta.versions = kept;

		for (const oldAuto of removed) {
			const snapshotPath = this.getSnapshotPath(docId, oldAuto.id);
			if (await this.app.vault.adapter.exists(snapshotPath)) {
				await this.app.vault.adapter.remove(snapshotPath);
			}
		}
	}

	private getDocDir(docId: string): string {
		return normalizePath(`${HISTORY_DIR}/${docId}`);
	}

	private getMetaPath(docId: string): string {
		return normalizePath(`${HISTORY_DIR}/${docId}/meta.json`);
	}

	private getSnapshotPath(docId: string, versionId: string): string {
		return normalizePath(`${HISTORY_DIR}/${docId}/${versionId}.md`);
	}
}
