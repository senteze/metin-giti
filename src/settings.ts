import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import { LanguagePreference, t } from './i18n';
import type MetinGitiPlugin from './main';
import {
	FileNamingMode,
	MetinGitiSettings,
	TrackingMode,
} from './types';
import { normalizeTrackedEntry } from './utils/path';

export const DEFAULT_SETTINGS: MetinGitiSettings = {
	language: 'auto',
	autoBackupEnabled: true,
	autoBackupIntervalMinutes: 2,
	trackingMode: 'all',
	trackedFiles: [],
	namingFormat: 'date',
	showExplorerBadges: true,
};

export class MetinGitiSettingTab extends PluginSettingTab {
	private readonly plugin: MetinGitiPlugin;

	constructor(app: App, plugin: MetinGitiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t('settingLanguageName'))
			.setDesc(t('settingLanguageDesc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('auto', t('settingLanguageAuto'))
					.addOption('tr', t('settingLanguageTr'))
					.addOption('en', t('settingLanguageEn'))
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language =
							value as LanguagePreference;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName(t('settingAutoBackupName'))
			.setDesc(t('settingAutoBackupDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoBackupEnabled)
					.onChange(async (value) => {
						this.plugin.settings.autoBackupEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.autoBackupEnabled) {
			new Setting(containerEl)
				.setName(t('settingIntervalName'))
				.setDesc(t('settingIntervalDesc'))
				.addText((text) =>
					text
						.setPlaceholder('2')
						.setValue(
							String(
								this.plugin.settings.autoBackupIntervalMinutes,
							),
						)
						.onChange(async (value) => {
							const parsed = Number.parseInt(value, 10);
							if (!Number.isNaN(parsed) && parsed >= 1) {
								this.plugin.settings.autoBackupIntervalMinutes =
									parsed;
								await this.plugin.saveSettings();
							}
						}),
				);

			new Setting(containerEl)
				.setName(t('settingTrackingModeName'))
				.setDesc(t('settingTrackingModeDesc'))
				.addDropdown((dropdown) =>
					dropdown
						.addOption('all', t('settingTrackingAll'))
						.addOption('tracked-only', t('settingTrackingOnly'))
						.setValue(this.plugin.settings.trackingMode)
						.onChange(async (value) => {
							this.plugin.settings.trackingMode =
								value as TrackingMode;
							await this.plugin.saveSettings();
							this.display();
						}),
				);

			if (this.plugin.settings.trackingMode === 'tracked-only') {
				this.renderTrackedPathsSection(containerEl);
			}
		}

		new Setting(containerEl)
			.setName(t('settingNamingFormatName'))
			.setDesc(t('settingNamingFormatDesc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('date', t('namingOptionDate'))
					.addOption('sequence', t('namingOptionSequence'))
					.setValue(this.plugin.settings.namingFormat)
					.onChange(async (value) => {
						this.plugin.settings.namingFormat =
							value as FileNamingMode;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t('settingExplorerBadgesName'))
			.setDesc(t('settingExplorerBadgesDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showExplorerBadges)
					.onChange(async (value) => {
						this.plugin.settings.showExplorerBadges = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderTrackedPathsSection(containerEl: HTMLElement): void {
		let pathInput: TextComponent | null = null;
		let pendingPath = '';

		const addEntry = async () => {
			const normalized = normalizeTrackedEntry(pendingPath);
			if (!normalized) {
				return;
			}
			if (!this.plugin.settings.trackedFiles.includes(normalized)) {
				this.plugin.settings.trackedFiles.push(normalized);
				if (normalized.toLowerCase().endsWith('.md')) {
					await this.plugin.setPathAutoBackupTracked(
						normalized,
						true,
					);
				}
				await this.plugin.saveSettings();
			}
			pendingPath = '';
			pathInput?.setValue('');
			this.display();
		};

		new Setting(containerEl)
			.setName(t('settingTrackedPathsName'))
			.setDesc(t('settingTrackedPathsDesc'))
			.addText((text) => {
				pathInput = text;
				text.setPlaceholder(
					t('settingTrackedPathsPlaceholder'),
				).onChange((value) => {
					pendingPath = value;
				});
			})
			.addButton((btn) =>
				btn
					.setButtonText(t('btnAddTrackedPath'))
					.setCta()
					.onClick(() => {
						void addEntry();
					}),
			);

		const listEl = containerEl.createDiv({ cls: 'mg-tracked-list' });
		if (this.plugin.settings.trackedFiles.length === 0) {
			listEl.createDiv({
				text: t('settingTrackedPathsEmpty'),
				cls: 'mg-tracked-empty',
			});
			return;
		}

		for (const entry of this.plugin.settings.trackedFiles) {
			const itemEl = listEl.createDiv({ cls: 'mg-tracked-item' });
			itemEl.createSpan({ text: entry, cls: 'mg-tracked-path' });

			const removeBtn = itemEl.createEl('button', {
				text: t('btnRemoveTrackedPath'),
				cls: 'mg-btn-action',
			});
			removeBtn.type = 'button';
			removeBtn.addEventListener('click', () => {
				void this.removeTrackedPath(entry);
			});
		}
	}

	private async removeTrackedPath(entry: string): Promise<void> {
		this.plugin.settings.trackedFiles =
			this.plugin.settings.trackedFiles.filter((item) => item !== entry);
		if (entry.toLowerCase().endsWith('.md')) {
			await this.plugin.setPathAutoBackupTracked(entry, false);
		}
		await this.plugin.saveSettings();
		this.display();
	}
}
