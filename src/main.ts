import { Notice, Plugin, TFile } from 'obsidian';
import { AutoBackupManager } from './backup/auto-backup';
import { DEFAULT_SETTINGS, MetinGitiSettingTab } from './settings';
import { VersionStore } from './storage/version-store';
import { MetinGitiSettings } from './types';
import { SaveVersionModal } from './ui/save-version-modal';
import { formatDateTimeLabel } from './utils/date';

export default class MetinGitiPlugin extends Plugin {
	settings!: MetinGitiSettings;
	private versionStore!: VersionStore;
	private autoBackup!: AutoBackupManager;

	async onload(): Promise<void> {
		await this.loadSettings();

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
		);

		this.addRibbonIcon('history', 'Sürüm Kaydet', () => {
			void this.openSaveVersionModal();
		});

		this.addRibbonIcon('zap', 'Hızlı Sürüm Kaydet', () => {
			void this.quickSaveActiveFile();
		});

		this.addCommand({
			id: 'save-version',
			name: 'Sürüm Kaydet',
			callback: () => {
				void this.openSaveVersionModal();
			},
		});

		this.addCommand({
			id: 'quick-save-version',
			name: 'Hızlı Sürüm Kaydet',
			callback: () => {
				void this.quickSaveActiveFile();
			},
		});

		this.addCommand({
			id: 'toggle-file-tracking',
			name: 'Bu dosya için sürüm takibini aç/kapat',
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
				void this.handleVaultDelete(file.path);
			}),
		);

		this.addSettingTab(new MetinGitiSettingTab(this.app, this));
	}

	onunload(): void {
		this.autoBackup?.destroy();
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
		this.autoBackup?.configure(
			this.settings.autoBackupEnabled,
			this.settings.autoBackupIntervalMinutes,
			this.settings.trackingMode,
			this.settings.trackedFiles,
		);
	}

	private getActiveMarkdownFile(): TFile | null {
		const activeFile = this.app.workspace.getActiveFile();
		if (
			!(activeFile instanceof TFile) ||
			activeFile.extension.toLowerCase() !== 'md'
		) {
			new Notice('Sürüm kaydetmek için önce bir not açmalısınız.');
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
				new Notice(`Hızlı sürüm kaydedildi: ${result.version.label}`);
			} else if (result.reason === 'duplicate') {
				new Notice('Değişiklik yok, yeni sürüm alınmadı');
			} else {
				new Notice('Bu dosya türü desteklenmiyor.');
			}
		} catch (error) {
			console.error('Metin Giti hızlı sürüm kaydetme hatası:', error);
			new Notice('Sürüm kaydedilirken bir hata oluştu.');
		}
	}

	private async toggleFileTracking(file: TFile): Promise<void> {
		const index = this.settings.trackedFiles.indexOf(file.path);
		if (index >= 0) {
			this.settings.trackedFiles.splice(index, 1);
			await this.saveSettings();
			new Notice(`"${file.basename}" için sürüm takibi kapatıldı.`);
		} else {
			this.settings.trackedFiles.push(file.path);
			await this.saveSettings();
			new Notice(`"${file.basename}" sürüm takibine alındı.`);
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
	}

	private async handleVaultDelete(filePath: string): Promise<void> {
		await this.versionStore.handleDelete(filePath);
		const trackedIdx = this.settings.trackedFiles.indexOf(filePath);
		if (trackedIdx >= 0) {
			this.settings.trackedFiles.splice(trackedIdx, 1);
			await this.saveSettings();
		}
	}
}
