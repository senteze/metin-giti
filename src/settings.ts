import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	TFile,
	TFolder,
	TextComponent,
	setIcon,
} from 'obsidian';
import { LanguagePreference, t } from './i18n';
import type MetinGitiPlugin from './main';
import {
	FileNamingMode,
	MetinGitiSettings,
	TrackingMode,
} from './types';
import { VaultPathSuggest } from './ui/path-suggest';
import { normalizeTrackedEntry, resolveVaultItem } from './utils/path';

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

	getSettingDefinitions(): SettingDefinitionItem<
		keyof MetinGitiSettings
	>[] {
		return [
			{
				name: t('settingLanguageName'),
				desc: t('settingLanguageDesc'),
				control: {
					type: 'dropdown',
					key: 'language',
					options: {
						auto: t('settingLanguageAuto'),
						tr: t('settingLanguageTr'),
						en: t('settingLanguageEn'),
					},
				},
			},
			{
				name: t('settingAutoBackupName'),
				desc: t('settingAutoBackupDesc'),
				control: {
					type: 'toggle',
					key: 'autoBackupEnabled',
				},
			},
			{
				name: t('settingIntervalName'),
				desc: t('settingIntervalDesc'),
				visible: () => this.plugin.settings.autoBackupEnabled,
				control: {
					type: 'number',
					key: 'autoBackupIntervalMinutes',
					placeholder: '2',
					min: 1,
					step: 1,
				},
			},
			{
				name: t('settingTrackingModeName'),
				desc: t('settingTrackingModeDesc'),
				visible: () => this.plugin.settings.autoBackupEnabled,
				control: {
					type: 'dropdown',
					key: 'trackingMode',
					options: {
						all: t('settingTrackingAll'),
						'tracked-only': t('settingTrackingOnly'),
					},
				},
			},
			{
				name: t('settingTrackedPathsName'),
				desc: t('settingTrackedPathsDesc'),
				visible: () =>
					this.plugin.settings.autoBackupEnabled &&
					this.plugin.settings.trackingMode === 'tracked-only',
				render: (setting) => {
					this.configureTrackedPathsSetting(setting);
					const parentEl = setting.settingEl.parentElement;
					if (!parentEl) {
						return;
					}
					const listEl = this.renderTrackedPathsList(parentEl);
					return () => {
						listEl.remove();
					};
				},
			},
			{
				name: t('settingNamingFormatName'),
				desc: t('settingNamingFormatDesc'),
				control: {
					type: 'dropdown',
					key: 'namingFormat',
					options: {
						date: t('namingOptionDate'),
						sequence: t('namingOptionSequence'),
					},
				},
			},
			{
				name: t('settingExplorerBadgesName'),
				desc: t('settingExplorerBadgesDesc'),
				control: {
					type: 'toggle',
					key: 'showExplorerBadges',
				},
			},
		];
	}

	override getControlValue(key: keyof MetinGitiSettings): unknown {
		return this.plugin.settings[key];
	}

	override async setControlValue(
		key: keyof MetinGitiSettings,
		value: unknown,
	): Promise<void> {
		switch (key) {
			case 'language':
				this.plugin.settings.language = value as LanguagePreference;
				await this.plugin.saveSettings();
				this.refreshUI();
				break;
			case 'autoBackupEnabled':
				this.plugin.settings.autoBackupEnabled = Boolean(value);
				await this.plugin.saveSettings();
				this.refreshUI();
				break;
			case 'autoBackupIntervalMinutes': {
				const parsed =
					typeof value === 'number'
						? Math.floor(value)
						: Number.parseInt(String(value), 10);
				if (!Number.isNaN(parsed) && parsed >= 1) {
					this.plugin.settings.autoBackupIntervalMinutes = parsed;
					await this.plugin.saveSettings();
				}
				break;
			}
			case 'trackingMode':
				this.plugin.settings.trackingMode = value as TrackingMode;
				await this.plugin.saveSettings();
				this.refreshUI();
				break;
			case 'namingFormat':
				this.plugin.settings.namingFormat = value as FileNamingMode;
				await this.plugin.saveSettings();
				break;
			case 'showExplorerBadges':
				this.plugin.settings.showExplorerBadges = Boolean(value);
				await this.plugin.saveSettings();
				break;
			default:
				break;
		}
	}

	private refreshUI(): void {
		const updateFn: unknown = Reflect.get(this, 'update');
		if (typeof updateFn === 'function') {
			(updateFn as () => void).call(this);
		} else {
			this.renderLegacySettings();
		}
	}

	display(): void {
		this.renderLegacySettings();
	}

	private renderLegacySettings(): void {
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
						this.renderLegacySettings();
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
						this.renderLegacySettings();
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
							this.renderLegacySettings();
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
		const setting = new Setting(containerEl)
			.setName(t('settingTrackedPathsName'))
			.setDesc(t('settingTrackedPathsDesc'));
		this.configureTrackedPathsSetting(setting);
		this.renderTrackedPathsList(containerEl);
	}

	private configureTrackedPathsSetting(setting: Setting): void {
		let pathInput: TextComponent | null = null;
		let pendingPath = '';

		const addEntry = async () => {
			const normalized = normalizeTrackedEntry(pendingPath);
			if (!normalized) {
				return;
			}

			const resolved = resolveVaultItem(this.app, normalized);
			if (
				!resolved ||
				(resolved instanceof TFile &&
					resolved.extension.toLowerCase() !== 'md')
			) {
				new Notice(t('noticePathNotFound'));
				return;
			}

			const canonicalEntry =
				resolved instanceof TFolder &&
				!normalized.endsWith('/') &&
				normalized !== '/'
					? `${normalized}/`
					: normalized;

			if (!this.plugin.settings.trackedFiles.includes(canonicalEntry)) {
				this.plugin.settings.trackedFiles.push(canonicalEntry);
				if (resolved instanceof TFile) {
					await this.plugin.setPathAutoBackupTracked(
						resolved.path,
						true,
					);
				}
				await this.plugin.saveSettings();
			}

			pendingPath = '';
			pathInput?.setValue('');
			this.refreshUI();
		};

		setting
			.addText((text) => {
				pathInput = text;
				text.setPlaceholder(
					t('settingTrackedPathsPlaceholder'),
				).onChange((value) => {
					pendingPath = value;
				});
				new VaultPathSuggest(this.app, text.inputEl, (selected) => {
					pendingPath = selected;
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
	}

	private renderTrackedPathsList(containerEl: HTMLElement): HTMLElement {
		const listEl = containerEl.createDiv({ cls: 'mg-tracked-list' });
		if (this.plugin.settings.trackedFiles.length === 0) {
			listEl.createDiv({
				text: t('settingTrackedPathsEmpty'),
				cls: 'mg-tracked-empty',
			});
			return listEl;
		}

		for (const entry of this.plugin.settings.trackedFiles) {
			const itemEl = listEl.createDiv({ cls: 'mg-tracked-item' });
			const leftEl = itemEl.createDiv({ cls: 'mg-tracked-left' });

			const resolved = resolveVaultItem(this.app, entry);
			const isValid =
				resolved !== null &&
				!(
					resolved instanceof TFile &&
					resolved.extension.toLowerCase() !== 'md'
				);

			const statusEl = leftEl.createSpan({
				cls: isValid
					? 'mg-tracked-status-icon mg-status-ok'
					: 'mg-tracked-status-icon mg-status-warn',
			});
			setIcon(statusEl, isValid ? 'check-circle' : 'alert-circle');
			const statusTooltip = isValid
				? t('tooltipAutoBackupConnected')
				: t('tooltipPathNotFound');
			statusEl.setAttribute('title', statusTooltip);
			statusEl.setAttribute('aria-label', statusTooltip);

			leftEl.createSpan({ text: entry, cls: 'mg-tracked-path' });

			const actionsEl = itemEl.createDiv({ cls: 'mg-tracked-actions' });

			const testBtn = actionsEl.createEl('button', {
				text: t('btnTestTrackedPath'),
				cls: 'mg-btn-action',
			});
			testBtn.type = 'button';
			testBtn.addEventListener('click', () => {
				void this.testTrackedPath(entry);
			});

			const removeBtn = actionsEl.createEl('button', {
				text: t('btnRemoveTrackedPath'),
				cls: 'mg-btn-action',
			});
			removeBtn.type = 'button';
			removeBtn.addEventListener('click', () => {
				void this.removeTrackedPath(entry);
			});
		}

		return listEl;
	}

	private async testTrackedPath(entry: string): Promise<void> {
		const result = await this.plugin.testTrackedPath(entry);
		if (result.ok) {
			new Notice(t('noticeTestSuccess', { path: entry }));
		} else if (result.reason === 'storage') {
			new Notice(t('noticeTestStorageError'));
		} else {
			new Notice(t('noticePathNotFound'));
		}
		this.refreshUI();
	}

	private async removeTrackedPath(entry: string): Promise<void> {
		this.plugin.settings.trackedFiles =
			this.plugin.settings.trackedFiles.filter((item) => item !== entry);
		if (entry.toLowerCase().endsWith('.md')) {
			await this.plugin.setPathAutoBackupTracked(entry, false);
		}
		await this.plugin.saveSettings();
		this.refreshUI();
	}
}
