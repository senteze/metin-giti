import { App, Modal, Notice, Setting, TFile, TextComponent } from 'obsidian';
import { t } from '../i18n';
import { VersionStore } from '../storage/version-store';
import { FileNamingMode } from '../types';

export class SaveVersionModal extends Modal {
	private readonly file: TFile;
	private readonly store: VersionStore;
	private readonly datePlaceholder: string;
	private readonly sequencePlaceholder: string;
	private readonly onSaved?: (savedAt: Date) => void;

	private currentNamingMode: FileNamingMode;
	private labelValue = '';
	private descriptionValue = '';
	private isSaving = false;

	constructor(
		app: App,
		file: TFile,
		store: VersionStore,
		initialNamingMode: FileNamingMode,
		datePlaceholder: string,
		sequencePlaceholder: string,
		onSaved?: (savedAt: Date) => void,
	) {
		super(app);
		this.file = file;
		this.store = store;
		this.currentNamingMode = initialNamingMode;
		this.datePlaceholder = datePlaceholder;
		this.sequencePlaceholder = sequencePlaceholder;
		this.onSaved = onSaved;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-modal');

		const headerEl = contentEl.createDiv({ cls: 'mg-modal-header' });
		headerEl.createEl('h2', { text: t('modalSaveTitle') });

		const fileBadge = headerEl.createDiv({ cls: 'mg-modal-file' });
		fileBadge.createSpan({
			text: t('modalNotePrefix'),
			cls: 'mg-modal-file-label',
		});
		fileBadge.createSpan({
			text: this.file.basename,
			cls: 'mg-modal-file-name',
		});

		let nameInput: TextComponent | null = null;
		const nameSetting = new Setting(contentEl)
			.setName(t('modalVersionName'))
			.setDesc(this.getNameDesc(this.currentNamingMode))
			.addText((text) => {
				nameInput = text;
				text.setPlaceholder(
					this.getPlaceholder(this.currentNamingMode),
				).onChange((value) => {
					this.labelValue = value;
				});
				text.inputEl.addClass('mg-input-full');
				window.setTimeout(() => text.inputEl.focus(), 10);
			});

		new Setting(contentEl)
			.setName(t('modalFileNamingName'))
			.setDesc(t('modalFileNamingDesc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('date', t('namingOptionDate'))
					.addOption('sequence', t('namingOptionSequence'))
					.setValue(this.currentNamingMode)
					.onChange(async (value) => {
						const nextMode = value as FileNamingMode;
						this.currentNamingMode = nextMode;
						nameSetting.setDesc(this.getNameDesc(nextMode));
						nameInput?.setPlaceholder(
							this.getPlaceholder(nextMode),
						);
						await this.store.setFileNamingMode(this.file, nextMode);
					}),
			);

		new Setting(contentEl)
			.setName(t('modalDescName'))
			.setDesc(t('modalDescDesc'))
			.addTextArea((area) => {
				area.setPlaceholder(t('modalDescPlaceholder')).onChange(
					(value) => {
						this.descriptionValue = value;
					},
				);
				area.inputEl.rows = 3;
				area.inputEl.addClass('mg-textarea-full');
			});

		const actionsEl = contentEl.createDiv({ cls: 'mg-modal-actions' });

		const cancelBtn = actionsEl.createEl('button', {
			text: t('btnCancel'),
			cls: 'mg-btn-secondary',
		});
		cancelBtn.type = 'button';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const saveBtn = actionsEl.createEl('button', {
			text: t('btnSave'),
			cls: 'mod-cta mg-btn-primary',
		});
		saveBtn.type = 'button';
		saveBtn.addEventListener('click', () => {
			void this.handleSave(saveBtn);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private getPlaceholder(mode: FileNamingMode): string {
		return mode === 'sequence'
			? this.sequencePlaceholder
			: this.datePlaceholder;
	}

	private getNameDesc(mode: FileNamingMode): string {
		if (mode === 'sequence') {
			return t('modalVersionNameDescSeq', {
				label: this.sequencePlaceholder,
			});
		}
		return t('modalVersionNameDescDate', {
			label: this.datePlaceholder,
		});
	}

	private async handleSave(saveBtn: HTMLButtonElement): Promise<void> {
		if (this.isSaving) {
			return;
		}
		this.isSaving = true;
		saveBtn.disabled = true;

		try {
			const result = await this.store.saveVersion(this.file, {
				kind: 'manual',
				label: this.labelValue,
				description: this.descriptionValue,
				namingMode: this.currentNamingMode,
			});

			if (result.saved) {
				new Notice(t('noticeVersionSaved'));
				this.onSaved?.(new Date());
				this.close();
			} else if (result.reason === 'duplicate') {
				new Notice(t('noticeNoChangesSinceLast'));
				this.close();
			} else {
				new Notice(t('noticeUnsupportedFile'));
			}
		} catch (error) {
			console.error('Metin Giti save error:', error);
			new Notice(t('noticeSaveError'));
		} finally {
			this.isSaving = false;
			saveBtn.disabled = false;
		}
	}
}
