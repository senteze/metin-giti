import { App, PluginSettingTab, Setting } from 'obsidian';
import type MetinGitiPlugin from './main';
import {
	FileNamingMode,
	MetinGitiSettings,
	TrackingMode,
} from './types';

export const DEFAULT_SETTINGS: MetinGitiSettings = {
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
			.setName('Otomatik yedekleme')
			.setDesc(
				'Etkin notta değişiklik yapıldığında arka planda sessizce yedek alır.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoBackupEnabled)
					.onChange(async (value) => {
						this.plugin.settings.autoBackupEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Otomatik yedekleme bekleme süresi (dakika)')
			.setDesc(
				'Son değişiklikten sonra otomatik yedek alınmadan önce beklenecek süre (en az 1 dakika).',
			)
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
			.setName('Takip modu')
			.setDesc(
				'Otomatik yedeklemenin tüm notlar için mi yoksa yalnızca seçtiğiniz notlar için mi çalışacağını belirleyin.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('all', 'Tüm dosyalar')
					.addOption(
						'tracked-only',
						'Sadece takip edilen dosyalar',
					)
					.setValue(this.plugin.settings.trackingMode)
					.onChange(async (value) => {
						this.plugin.settings.trackingMode =
							value as TrackingMode;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Varsayılan / Hızlı kayıt isimlendirme biçimi')
			.setDesc(
				'Dosya için özel bir seçim yapılmadığında kullanılacak varsayılan etiket biçimini seçin.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('date', 'Tarih ve saat (GG.AA.YYYY SS:DD)')
					.addOption('sequence', 'Sıralı numara (v1, v2, v3...)')
					.setValue(this.plugin.settings.namingFormat)
					.onChange(async (value) => {
						this.plugin.settings.namingFormat =
							value as FileNamingMode;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Dosya gezgininde sürüm rozetlerini göster')
			.setDesc(
				'Sol dosya gezgininde sürüm geçmişi olan notların yanında sürüm sayısı rozetini gösterir.',
			)
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
