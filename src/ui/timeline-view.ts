import { ItemView, Notice, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { VersionStore } from '../storage/version-store';
import { VersionMeta } from '../types';
import { formatDateTimeLabel } from '../utils/date';
import { computeContentHash } from '../utils/hash';
import { RestoreConfirmModal } from './restore-confirm-modal';

export const TIMELINE_VIEW_TYPE = 'metin-giti-timeline';

export interface TimelineViewCallbacks {
	onSaveModal: () => Promise<void>;
	onQuickSave: () => Promise<void>;
	onBeforeRestore: (file: TFile, restoredHash: string) => void;
	onVersionRestored: () => void;
}

type TimelineSegment =
	| { type: 'manual'; version: VersionMeta }
	| { type: 'auto-group'; key: string; versions: VersionMeta[] };

export class TimelineView extends ItemView {
	private readonly store: VersionStore;
	private readonly callbacks: TimelineViewCallbacks;
	private readonly expandedGroups: Set<string> = new Set();
	private renderToken = 0;

	constructor(
		leaf: WorkspaceLeaf,
		store: VersionStore,
		callbacks: TimelineViewCallbacks,
	) {
		super(leaf);
		this.store = store;
		this.callbacks = callbacks;
	}

	getViewType(): string {
		return TIMELINE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Sürüm Geçmişi';
	}

	getIcon(): string {
		return 'history';
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.renderToken += 1;
		this.expandedGroups.clear();
		this.contentEl.empty();
	}

	/**
	 * Re-renders the timeline for the currently active Markdown file.
	 */
	async refresh(): Promise<void> {
		const token = ++this.renderToken;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-timeline-root');

		const activeFile = this.getActiveMarkdownFile();
		this.renderHeader(contentEl, activeFile);

		const bodyEl = contentEl.createDiv({ cls: 'mg-timeline-body' });

		if (!activeFile) {
			this.renderEmptyState(
				bodyEl,
				'Sürüm geçmişini görmek için bir not açın.',
			);
			return;
		}

		const history = await this.store.getFileHistory(activeFile);
		if (token !== this.renderToken) {
			return;
		}

		if (!history || history.versions.length === 0) {
			this.renderEmptyState(
				bodyEl,
				'Bu not için henüz kayıtlı sürüm yok.',
			);
			return;
		}

		const segments = this.groupVersions(
			activeFile.path,
			history.versions,
		);
		const listEl = bodyEl.createDiv({ cls: 'mg-timeline-list' });

		for (const segment of segments) {
			if (segment.type === 'manual') {
				this.renderManualItem(listEl, activeFile, segment.version);
			} else {
				this.renderAutoGroup(listEl, activeFile, segment);
			}
		}
	}

	private getActiveMarkdownFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();
		if (file instanceof TFile && file.extension.toLowerCase() === 'md') {
			return file;
		}
		return null;
	}

	private renderHeader(
		containerEl: HTMLElement,
		activeFile: TFile | null,
	): void {
		const headerEl = containerEl.createDiv({ cls: 'mg-timeline-header' });

		const titleRow = headerEl.createDiv({ cls: 'mg-timeline-title-row' });
		titleRow.createDiv({
			text: activeFile ? activeFile.basename : 'Etkin not yok',
			cls: 'mg-timeline-filename',
		});

		const actionsEl = headerEl.createDiv({
			cls: 'mg-timeline-top-actions',
		});

		const saveBtn = actionsEl.createEl('button', {
			text: 'Sürüm Kaydet',
			cls: 'mod-cta mg-btn-compact',
		});
		saveBtn.type = 'button';
		saveBtn.disabled = !activeFile;
		saveBtn.addEventListener('click', () => {
			void this.callbacks.onSaveModal();
		});

		const quickBtn = actionsEl.createEl('button', {
			text: 'Hızlı Kaydet',
			cls: 'mg-btn-compact',
		});
		quickBtn.type = 'button';
		quickBtn.disabled = !activeFile;
		quickBtn.addEventListener('click', () => {
			void this.callbacks.onQuickSave();
		});
	}

	private renderEmptyState(containerEl: HTMLElement, message: string): void {
		const emptyEl = containerEl.createDiv({ cls: 'mg-timeline-empty' });
		emptyEl.createEl('p', { text: message });
	}

	private groupVersions(
		filePath: string,
		versions: VersionMeta[],
	): TimelineSegment[] {
		const segments: TimelineSegment[] = [];
		let pendingAutos: VersionMeta[] = [];

		const flushAutos = () => {
			if (pendingAutos.length === 0) {
				return;
			}
			const first = pendingAutos[0];
			if (first) {
				segments.push({
					type: 'auto-group',
					key: `${filePath}::${first.id}`,
					versions: pendingAutos,
				});
			}
			pendingAutos = [];
		};

		for (const version of versions) {
			if (version.kind === 'manual') {
				flushAutos();
				segments.push({ type: 'manual', version });
			} else {
				pendingAutos.push(version);
			}
		}
		flushAutos();

		return segments;
	}

	private renderManualItem(
		listEl: HTMLElement,
		file: TFile,
		version: VersionMeta,
	): void {
		const itemEl = listEl.createDiv({
			cls: 'mg-timeline-item mg-timeline-manual',
		});
		itemEl.createDiv({ cls: 'mg-timeline-dot mg-dot-manual' });

		const cardEl = itemEl.createDiv({
			cls: 'mg-version-card mg-version-card-manual',
		});
		this.renderVersionCardContent(cardEl, file, version, false);
	}

	private renderAutoGroup(
		listEl: HTMLElement,
		file: TFile,
		segment: Extract<TimelineSegment, { type: 'auto-group' }>,
	): void {
		const itemEl = listEl.createDiv({
			cls: 'mg-timeline-item mg-timeline-auto-group',
		});
		itemEl.createDiv({ cls: 'mg-timeline-dot mg-dot-auto' });

		const groupEl = itemEl.createDiv({ cls: 'mg-auto-group-container' });
		let isExpanded = this.expandedGroups.has(segment.key);

		const toggleBtn = groupEl.createEl('button', {
			cls: 'mg-auto-group-toggle',
		});
		toggleBtn.type = 'button';

		const cardsContainer = groupEl.createDiv({
			cls: 'mg-auto-group-list',
		});

		const syncState = () => {
			const count = segment.versions.length;
			toggleBtn.setText(
				isExpanded
					? `${count} otomatik yedek — gizlemek için tıkla`
					: `${count} otomatik yedek — görmek için tıkla`,
			);
			cardsContainer.empty();
			if (!isExpanded) {
				cardsContainer.addClass('mg-hidden');
				return;
			}
			cardsContainer.removeClass('mg-hidden');
			for (const version of segment.versions) {
				const cardEl = cardsContainer.createDiv({
					cls: 'mg-version-card mg-version-card-auto',
				});
				this.renderVersionCardContent(cardEl, file, version, true);
			}
		};

		toggleBtn.addEventListener('click', () => {
			isExpanded = !isExpanded;
			if (isExpanded) {
				this.expandedGroups.add(segment.key);
			} else {
				this.expandedGroups.delete(segment.key);
			}
			syncState();
		});

		syncState();
	}

	private renderVersionCardContent(
		cardEl: HTMLElement,
		file: TFile,
		version: VersionMeta,
		isAuto: boolean,
	): void {
		const topRow = cardEl.createDiv({ cls: 'mg-version-card-top' });
		const titleText = isAuto ? `Oto-yedek • ${version.label}` : version.label;
		topRow.createSpan({
			text: titleText,
			cls: 'mg-version-label',
		});

		const dateText = formatDateTimeLabel(new Date(version.createdAt));
		if (!version.label.includes(dateText)) {
			cardEl.createDiv({
				text: dateText,
				cls: 'mg-version-date',
			});
		}

		if (version.description && version.description.trim().length > 0) {
			cardEl.createDiv({
				text: version.description,
				cls: 'mg-version-desc',
			});
		}

		const actionsEl = cardEl.createDiv({ cls: 'mg-version-actions' });

		const restoreBtn = actionsEl.createEl('button', {
			text: 'Eski Haline Dön',
			cls: 'mg-btn-action',
		});
		restoreBtn.type = 'button';
		restoreBtn.addEventListener('click', () => {
			this.promptRestore(file, version);
		});

		const exportBtn = actionsEl.createEl('button', {
			text: 'Dışa Aktar',
			cls: 'mg-btn-action',
		});
		exportBtn.type = 'button';
		exportBtn.addEventListener('click', () => {
			void this.exportVersion(file, version);
		});
	}

	private promptRestore(file: TFile, version: VersionMeta): void {
		new RestoreConfirmModal(
			this.app,
			file.basename,
			version,
			async () => {
				const snapshot = await this.store.readVersionContent(
					file,
					version.id,
				);
				if (snapshot === null) {
					new Notice('Seçilen sürümün içeriği okunamadı.');
					return;
				}

				// Safety backup only if current content does not match any saved version in history
				const currentContent = await this.app.vault.read(file);
				const alreadySaved = await this.store.hasContentHash(
					file,
					currentContent,
				);
				if (!alreadySaved) {
					await this.store.saveVersion(file, { kind: 'auto' });
				}
				const restoredHash = await computeContentHash(snapshot);
				this.callbacks.onBeforeRestore(file, restoredHash);
				await this.app.vault.modify(file, snapshot);
				this.callbacks.onVersionRestored();
				new Notice(`Not "${version.label}" sürümüne döndürüldü.`);
			},
		).open();
	}

	private async exportVersion(
		file: TFile,
		version: VersionMeta,
	): Promise<void> {
		try {
			const snapshot = await this.store.readVersionContent(
				file,
				version.id,
			);
			if (snapshot === null) {
				new Notice('Seçilen sürümün içeriği okunamadı.');
				return;
			}

			const targetPath = await this.buildUniqueExportPath(file, version);
			await this.app.vault.create(targetPath, snapshot);
			const fileName = targetPath.split('/').pop() ?? targetPath;
			new Notice(`Sürüm dışa aktarıldı: ${fileName}`);
		} catch (error) {
			console.error('Metin Giti dışa aktarma hatası:', error);
			new Notice('Sürüm dışa aktarılırken bir hata oluştu.');
		}
	}

	private async buildUniqueExportPath(
		file: TFile,
		version: VersionMeta,
	): Promise<string> {
		const folderPath =
			file.parent && file.parent.path !== '/' ? `${file.parent.path}/` : '';
		const safeSuffix = this.sanitizeFilenamePart(version.label);
		const baseName = `${file.basename}_${safeSuffix}`;

		let candidate = normalizePath(`${folderPath}${baseName}.md`);
		let counter = 1;
		while (await this.app.vault.adapter.exists(candidate)) {
			candidate = normalizePath(`${folderPath}${baseName}_${counter}.md`);
			counter += 1;
		}
		return candidate;
	}

	private sanitizeFilenamePart(raw: string): string {
		const cleaned = raw
			.trim()
			.replace(/[\\/:*?"<>|]+/g, '-')
			.replace(/\./g, '-')
			.replace(/\s+/g, '_')
			.replace(/-+/g, '-')
			.replace(/^[-_]+|[-_]+$/g, '');
		return cleaned.length > 0 ? cleaned : 'surum';
	}
}
