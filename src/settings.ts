import { App, PluginSettingTab, Setting } from 'obsidian';
import { LanguagePreference, t } from './i18n';
import type MetinGitiPlugin from './main';
import {
	FileNamingMode,
	MetinGitiSettings,
	TrackingMode,
} from './types';

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
					}),
			);

		new Setting(containerEl)
			.setName(t('settingIntervalName'))
			.setDesc(t('settingIntervalDesc'))
			.addText((text) =>
				text
					.setPlaceholder('2')
					.setValue(
						String(this.plugin.settings.autoBackupIntervalMinutes),
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
					}),
			);

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
}
