import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import { AutoBackupManager } from './backup/auto-backup';
import { setLanguagePreference, t } from './i18n';
import { DEFAULT_SETTINGS, MetinGitiSettingTab } from './settings';
import { VersionStore } from './storage/version-store';
import { MetinGitiSettings } from './types';
import { DeleteHistoryModal } from './ui/delete-history-modal';
import {
	CURRENT_SIDE_ID,
	DIFF_VIEW_TYPE,
	DiffView,
} from './ui/diff-view';
import { FileExplorerBadges } from './ui/file-explorer-badges';
import { SaveVersionModal } from './ui/save-version-modal';
import { TIMELINE_VIEW_TYPE, TimelineView } from './ui/timeline-view';
import { formatDateTimeLabel } from './utils/date';

export default class MetinGitiPlugin extends Plugin {
	settings!: MetinGitiSettings;
	private versionStore!: VersionStore;
	private autoBackup!: AutoBackupManager;
	private explorerBadges!: FileExplorerBadges;

	async onload(): Promise<void> {
		await this.loadSettings();
		setLanguagePreference(this.settings.language);

		this.versionStore = new VersionStore(this.app);
		await this.versionStore.initialize();

		const statusBarItemEl = this.addStatusBarItem();
		this.autoBackup = new AutoBackupManager(
			this.app,
			this.versionStore,
			statusBarItemEl,
			this.settings.autoBackupEnabled,
			this.settings.autoBackupIntervalMinutes,
			this.settings.trackingMode,
			this.settings.trackedFiles,
			() => {
				void this.refreshTimelineViews();
				this.explorerBadges.refresh();
			},
		);

		this.explorerBadges = new FileExplorerBadges(
			this.app,
			this.versionStore,
			this.settings.showExplorerBadges,
			this.settings.autoBackupEnabled,
			this.settings.trackingMode,
			this.settings.trackedFiles,
			(file) => {
				void this.openFileAndTimeline(file);
			},
		);

		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf) =>
				new TimelineView(leaf, this.versionStore, {
					onSaveModal: () => this.openSaveVersionModal(),
					onQuickSave: () => this.quickSaveActiveFile(),
					onCompareVersion: (file, leftId, rightId) =>
						this.openDiffView(file, leftId, rightId),
					onBeforeRestore: (file, restoredHash) => {
						this.autoBackup.suppressAfterRestore(
							file.path,
							restoredHash,
						);
					},
					onVersionRestored: () => {
						this.autoBackup.recordBackupTime(new Date());
						void this.refreshTimelineViews();
						void this.refreshDiffViews();
					},
					onVersionDeleted: () => {
						this.autoBackup.refreshStatusText();
						this.explorerBadges.refresh();
						void this.refreshDiffViews();
					},
				}),
		);

		this.registerView(
			DIFF_VIEW_TYPE,
			(leaf) =>
				new DiffView(leaf, this.versionStore, {
					onBeforeRestore: (file, restoredHash) => {
						this.autoBackup.suppressAfterRestore(
							file.path,
							restoredHash,
						);
					},
					onContentUpdated: () => {
						this.autoBackup.recordBackupTime(new Date());
						void this.refreshTimelineViews();
					},
				}),
		);

		this.addRibbonIcon('history', t('cmdShowHistory'), () => {
			void this.activateTimelineView();
		});

		this.addRibbonIcon('bookmark-plus', t('cmdSaveVersion'), () => {
			void this.openSaveVersionModal();
		});

		this.addRibbonIcon('zap', t('cmdQuickSave'), () => {
			void this.quickSaveActiveFile();
		});

		this.addCommand({
			id: 'show-version-history',
			name: t('cmdShowHistory'),
			callback: () => {
				void this.activateTimelineView();
			},
		});

		this.addCommand({
			id: 'save-version',
			name: t('cmdSaveVersion'),
			callback: () => {
				void this.openSaveVersionModal();
			},
		});

		this.addCommand({
			id: 'quick-save-version',
			name: t('cmdQuickSave'),
			callback: () => {
				void this.quickSaveActiveFile();
			},
		});

		this.addCommand({
			id: 'toggle-file-tracking',
			name: t('cmdToggleTracking'),
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (
					!(activeFile instanceof TFile) ||
					activeFile.extension.toLowerCase() !== 'md'
				) {
					return false;
				}
				if (!checking) {
					void this.toggleFileTracking(activeFile);
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				void this.refreshTimelineViews();
			}),
		);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.explorerBadges.refresh();
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.explorerBadges.start();
		});

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				this.autoBackup.markDirty(file);
			}),
		);

		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				void this.handleVaultRename(oldPath, file.path);
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				void this.handleVaultDelete(file);
			}),
		);

		this.addSettingTab(new MetinGitiSettingTab(this.app, this));
	}

	onunload(): void {
		this.autoBackup?.destroy();
		this.explorerBadges?.destroy();
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<MetinGitiSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		if (!Array.isArray(this.settings.trackedFiles)) {
			this.settings.trackedFiles = [];
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		setLanguagePreference(this.settings.language);
		this.autoBackup?.configure(
			this.settings.autoBackupEnabled,
			this.settings.autoBackupIntervalMinutes,
			this.settings.trackingMode,
			this.settings.trackedFiles,
		);
		this.autoBackup?.refreshStatusText();
		this.explorerBadges?.configure(
			this.settings.showExplorerBadges,
			this.settings.autoBackupEnabled,
			this.settings.trackingMode,
			this.settings.trackedFiles,
		);
		this.explorerBadges?.refresh();
		void this.refreshTimelineViews();
		void this.refreshDiffViews();
	}

	private async openFileAndTimeline(file: TFile): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.path !== file.path) {
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		}
		await this.activateTimelineView();
	}

	private async activateTimelineView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: TIMELINE_VIEW_TYPE,
					active: true,
				});
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			await workspace.revealLeaf(leaf);
			if (leaf.view instanceof TimelineView) {
				await leaf.view.refresh();
			}
		}
	}

	private async refreshTimelineViews(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof TimelineView) {
				await leaf.view.refresh();
			}
		}
	}

	private async openDiffView(
		file: TFile,
		leftId: string,
		rightId: string = CURRENT_SIDE_ID,
	): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(DIFF_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({
				type: DIFF_VIEW_TYPE,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
		if (leaf.view instanceof DiffView) {
			await leaf.view.setTarget(file, leftId, rightId);
		}
	}

	private async refreshDiffViews(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(DIFF_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof DiffView) {
				await leaf.view.refresh();
			}
		}
	}

	private getActiveMarkdownFile(): TFile | null {
		const activeFile = this.app.workspace.getActiveFile();
		if (
			!(activeFile instanceof TFile) ||
			activeFile.extension.toLowerCase() !== 'md'
		) {
			new Notice(t('noticeOpenNoteFirst'));
			return null;
		}
		return activeFile;
	}

	private async openSaveVersionModal(): Promise<void> {
		const activeFile = this.getActiveMarkdownFile();
		if (!activeFile) {
			return;
		}

		const [initialMode, sequencePlaceholder] = await Promise.all([
			this.versionStore.getFileNamingMode(
				activeFile,
				this.settings.namingFormat,
			),
			this.versionStore.getDefaultLabel(activeFile, 'sequence'),
		]);
		const datePlaceholder = formatDateTimeLabel(new Date());

		new SaveVersionModal(
			this.app,
			activeFile,
			this.versionStore,
			initialMode,
			datePlaceholder,
			sequencePlaceholder,
			(savedAt) => {
				this.autoBackup.recordBackupTime(savedAt);
				void this.refreshTimelineViews();
				this.explorerBadges.refresh();
			},
		).open();
	}

	private async quickSaveActiveFile(): Promise<void> {
		const activeFile = this.getActiveMarkdownFile();
		if (!activeFile) {
			return;
		}

		try {
			const result = await this.versionStore.saveVersion(activeFile, {
				kind: 'manual',
				namingMode: this.settings.namingFormat,
			});

			if (result.saved && result.version) {
				this.autoBackup.recordBackupTime(new Date());
				void this.refreshTimelineViews();
				this.explorerBadges.refresh();
				new Notice(
					t('noticeQuickSaved', { label: result.version.label }),
				);
			} else if (result.reason === 'duplicate') {
				new Notice(t('noticeNoChangesQuick'));
			} else {
				new Notice(t('noticeUnsupportedFile'));
			}
		} catch (error) {
			console.error('Metin Giti quick save error:', error);
			new Notice(t('noticeSaveError'));
		}
	}

	async setPathAutoBackupTracked(
		filePath: string,
		tracked: boolean,
	): Promise<void> {
		await this.versionStore.setFileAutoBackupTracked(filePath, tracked);
	}

	async testTrackedPath(
		entry: string,
	): Promise<{ ok: boolean; reason?: 'missing' | 'storage' }> {
		return this.autoBackup.testTrackedEntry(entry);
	}

	private async toggleFileTracking(file: TFile): Promise<void> {
		const index = this.settings.trackedFiles.indexOf(file.path);
		if (index >= 0) {
			this.settings.trackedFiles.splice(index, 1);
			await this.versionStore.setFileAutoBackupTracked(file.path, false);
			await this.saveSettings();
			new Notice(t('noticeTrackingDisabled', { name: file.basename }));
		} else {
			this.settings.trackedFiles.push(file.path);
			await this.versionStore.setFileAutoBackupTracked(file.path, true);
			await this.saveSettings();
			new Notice(t('noticeTrackingEnabled', { name: file.basename }));
		}
	}

	private async handleVaultRename(
		oldPath: string,
		newPath: string,
	): Promise<void> {
		await this.versionStore.handleRename(oldPath, newPath);
		const trackedIdx = this.settings.trackedFiles.indexOf(oldPath);
		if (trackedIdx >= 0) {
			this.settings.trackedFiles[trackedIdx] = newPath;
			await this.saveSettings();
		}
		await this.refreshTimelineViews();
		this.explorerBadges.refresh();
	}

	private async handleVaultDelete(file: TAbstractFile): Promise<void> {
		this.autoBackup.cancelForFile(file.path);

		if (file instanceof TFile && file.extension.toLowerCase() === 'md') {
			const versionCount = await this.versionStore.getVersionCountByPath(
				file.path,
			);
			if (versionCount > 0) {
				new DeleteHistoryModal(
					this.app,
					file.basename,
					versionCount,
					async () => {
						await this.versionStore.deleteDocumentHistory(
							file.path,
						);
						const trackedIdx = this.settings.trackedFiles.indexOf(
							file.path,
						);
						if (trackedIdx >= 0) {
							this.settings.trackedFiles.splice(trackedIdx, 1);
							await this.saveSettings();
						}
						new Notice(t('noticeHistoryDeleted'));
						await this.refreshTimelineViews();
						this.explorerBadges.refresh();
					},
				).open();
			} else {
				await this.versionStore.handleDelete(file.path);
			}
		}

		await this.refreshTimelineViews();
		this.explorerBadges.refresh();
	}
}
