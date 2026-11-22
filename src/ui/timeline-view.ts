import { ItemView, Notice, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { t } from '../i18n';
import { VersionStore } from '../storage/version-store';
import { VersionMeta } from '../types';
import { formatDateTimeLabel } from '../utils/date';
import { computeContentHash } from '../utils/hash';
import { CURRENT_SIDE_ID } from './diff-view';
import { DeleteVersionModal } from './delete-version-modal';
import { RestoreConfirmModal } from './restore-confirm-modal';

export const TIMELINE_VIEW_TYPE = 'metin-giti-timeline';

export interface TimelineViewCallbacks {
	onSaveModal: () => Promise<void>;
	onQuickSave: () => Promise<void>;
	onCompareVersion: (
		file: TFile,
		leftId: string,
		rightId: string,
	) => Promise<void>;
	onBeforeRestore: (file: TFile, restoredHash: string) => void;
	onVersionRestored: () => void;
	onVersionDeleted: () => void;
}

type TimelineSegment =
	| { type: 'manual'; version: VersionMeta }
	| { type: 'auto-group'; key: string; versions: VersionMeta[] };

export class TimelineView extends ItemView {
	private readonly store: VersionStore;
	private readonly callbacks: TimelineViewCallbacks;
	private readonly expandedGroups: Set<string> = new Set();
	private renderToken = 0;
	private isCompareMode = false;
	private selectedCompareIds: string[] = [];
	private selectedFilePath: string | null = null;
	private currentVersions: VersionMeta[] = [];

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
		return t('timelineDisplayText');
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
		this.isCompareMode = false;
		this.selectedCompareIds = [];
		this.selectedFilePath = null;
		this.currentVersions = [];
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
		if (!activeFile || activeFile.path !== this.selectedFilePath) {
			this.isCompareMode = false;
			this.selectedCompareIds = [];
			this.selectedFilePath = activeFile?.path ?? null;
		}

		this.renderHeader(contentEl, activeFile);

		const bodyEl = contentEl.createDiv({ cls: 'mg-timeline-body' });

		if (!activeFile) {
			this.currentVersions = [];
			this.renderEmptyState(bodyEl, t('timelineEmptyOpenNote'));
			return;
		}

		const history = await this.store.getFileHistory(activeFile);
		if (token !== this.renderToken) {
			return;
		}

		if (!history || history.versions.length === 0) {
			this.currentVersions = [];
			this.renderEmptyState(bodyEl, t('timelineEmptyNoVersions'));
			return;
		}

		this.currentVersions = history.versions;
		if (this.isCompareMode) {
			this.renderCompareBar(bodyEl, activeFile);
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
			text: activeFile ? activeFile.basename : t('timelineNoActiveNote'),
			cls: 'mg-timeline-filename',
		});

		const actionsEl = headerEl.createDiv({
			cls: 'mg-timeline-top-actions',
		});

		const saveBtn = actionsEl.createEl('button', {
			text: t('cmdSaveVersion'),
			cls: 'mod-cta mg-btn-compact',
		});
		saveBtn.type = 'button';
		saveBtn.disabled = !activeFile;
		saveBtn.addEventListener('click', () => {
			void this.callbacks.onSaveModal();
		});

		const quickBtn = actionsEl.createEl('button', {
			text: t('btnQuickSave'),
			cls: 'mg-btn-compact',
		});
		quickBtn.type = 'button';
		quickBtn.disabled = !activeFile;
		quickBtn.addEventListener('click', () => {
			void this.callbacks.onQuickSave();
		});

		const compareModeBtn = actionsEl.createEl('button', {
			text: this.isCompareMode
				? t('btnCancelSelection')
				: t('btnCompareTwo'),
			cls: this.isCompareMode
				? 'mg-btn-compact mg-btn-active'
				: 'mg-btn-compact',
		});
		compareModeBtn.type = 'button';
		compareModeBtn.disabled = !activeFile;
		compareModeBtn.addEventListener('click', () => {
			this.isCompareMode = !this.isCompareMode;
			this.selectedCompareIds = [];
			void this.refresh();
		});
	}

	private renderCompareBar(bodyEl: HTMLElement, file: TFile): void {
		const barEl = bodyEl.createDiv({ cls: 'mg-compare-bar' });

		const currentRow = barEl.createEl('label', {
			cls: 'mg-compare-current-option',
		});
		const currentCb = currentRow.createEl('input', {
			type: 'checkbox',
			cls: 'mg-compare-checkbox',
		});
		const isCurrentSelected =
			this.selectedCompareIds.includes(CURRENT_SIDE_ID);
		currentCb.checked = isCurrentSelected;
		currentCb.disabled =
			!isCurrentSelected && this.selectedCompareIds.length >= 2;
		currentCb.addEventListener('change', () => {
			this.toggleCompareSelection(CURRENT_SIDE_ID, currentCb.checked);
		});
		currentRow.createSpan({ text: t('labelCurrentVersion') });

		const footerEl = barEl.createDiv({ cls: 'mg-compare-bar-footer' });
		footerEl.createSpan({
			text: t('labelSelectedCount', {
				count: this.selectedCompareIds.length,
			}),
			cls: 'mg-compare-count',
		});

		const runBtn = footerEl.createEl('button', {
			text: t('btnCompareSelected'),
			cls: 'mod-cta mg-btn-compact',
		});
		runBtn.type = 'button';
		runBtn.disabled = this.selectedCompareIds.length !== 2;
		runBtn.addEventListener('click', () => {
			void this.runTwoVersionCompare(file);
		});
	}

	private toggleCompareSelection(id: string, checked: boolean): void {
		if (checked) {
			if (
				!this.selectedCompareIds.includes(id) &&
				this.selectedCompareIds.length < 2
			) {
				this.selectedCompareIds.push(id);
			}
		} else {
			this.selectedCompareIds = this.selectedCompareIds.filter(
				(item) => item !== id,
			);
		}
		void this.refresh();
	}

	private async runTwoVersionCompare(file: TFile): Promise<void> {
		if (this.selectedCompareIds.length !== 2) {
			return;
		}
		const [firstId, secondId] = this.selectedCompareIds;
		if (!firstId || !secondId) {
			return;
		}

		const getTimestamp = (id: string): number => {
			if (id === CURRENT_SIDE_ID) {
				return Number.POSITIVE_INFINITY;
			}
			const meta = this.currentVersions.find((v) => v.id === id);
			return meta ? new Date(meta.createdAt).getTime() : 0;
		};

		const sorted = [firstId, secondId].sort(
			(a, b) => getTimestamp(b) - getTimestamp(a),
		);
		const newerId = sorted[0] ?? firstId;
		const olderId = sorted[1] ?? secondId;

		this.isCompareMode = false;
		this.selectedCompareIds = [];
		await this.refresh();
		await this.callbacks.onCompareVersion(file, newerId, olderId);
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
					? t('autoBackupGroupHide', { count })
					: t('autoBackupGroupShow', { count }),
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
		const topRow = cardEl.createDiv({
			cls: 'mg-version-card-top mg-version-card-clickable',
		});

		if (this.isCompareMode) {
			const cb = topRow.createEl('input', {
				type: 'checkbox',
				cls: 'mg-compare-checkbox',
			});
			const isSelected = this.selectedCompareIds.includes(version.id);
			cb.checked = isSelected;
			cb.disabled = !isSelected && this.selectedCompareIds.length >= 2;
			cb.addEventListener('click', (evt) => {
				evt.stopPropagation();
			});
			cb.addEventListener('change', () => {
				this.toggleCompareSelection(version.id, cb.checked);
			});
		}

		const titleText = isAuto
			? t('autoBackupCardTitle', { label: version.label })
			: version.label;
		topRow.createSpan({
			text: titleText,
			cls: 'mg-version-label',
		});
		topRow.addEventListener('click', () => {
			if (this.isCompareMode) {
				const isSelected = this.selectedCompareIds.includes(version.id);
				if (isSelected || this.selectedCompareIds.length < 2) {
					this.toggleCompareSelection(version.id, !isSelected);
				}
				return;
			}
			void this.callbacks.onCompareVersion(
				file,
				CURRENT_SIDE_ID,
				version.id,
			);
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

		const compareBtn = actionsEl.createEl('button', {
			text: t('btnCompare'),
			cls: 'mg-btn-action',
		});
		compareBtn.type = 'button';
		compareBtn.addEventListener('click', () => {
			void this.callbacks.onCompareVersion(
				file,
				CURRENT_SIDE_ID,
				version.id,
			);
		});

		const restoreBtn = actionsEl.createEl('button', {
			text: t('btnRestore'),
			cls: 'mg-btn-action',
		});
		restoreBtn.type = 'button';
		restoreBtn.addEventListener('click', () => {
			this.promptRestore(file, version);
		});

		const exportBtn = actionsEl.createEl('button', {
			text: t('btnExport'),
			cls: 'mg-btn-action',
		});
		exportBtn.type = 'button';
		exportBtn.addEventListener('click', () => {
			void this.exportVersion(file, version);
		});

		const deleteBtn = actionsEl.createEl('button', {
			text: t('btnDelete'),
			cls: 'mg-btn-action mg-btn-delete-version',
		});
		deleteBtn.type = 'button';
		deleteBtn.addEventListener('click', () => {
			this.promptDeleteVersion(file, version);
		});
	}

	private promptDeleteVersion(file: TFile, version: VersionMeta): void {
		new DeleteVersionModal(this.app, version.label, async () => {
			const deleted = await this.store.deleteVersion(
				file.path,
				version.id,
			);
			if (!deleted) {
				return;
			}
			this.selectedCompareIds = this.selectedCompareIds.filter(
				(id) => id !== version.id,
			);
			new Notice(t('noticeVersionDeleted', { label: version.label }));
			await this.refresh();
			this.callbacks.onVersionDeleted();
		}).open();
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
					new Notice(t('noticeVersionReadError'));
					return;
				}

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
				new Notice(t('noticeRestoredTo', { label: version.label }));
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
				new Notice(t('noticeVersionReadError'));
				return;
			}

			const targetPath = await this.buildUniqueExportPath(file, version);
			await this.app.vault.create(targetPath, snapshot);
			const fileName = targetPath.split('/').pop() ?? targetPath;
			new Notice(t('noticeExported', { fileName }));
		} catch (error) {
			console.error('Metin Giti export error:', error);
			new Notice(t('noticeExportError'));
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
