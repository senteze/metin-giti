import { App, Modal, Notice, Setting, TFile, TextComponent } from 'obsidian';
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
		headerEl.createEl('h2', { text: 'Sürüm Kaydet' });

		const fileBadge = headerEl.createDiv({ cls: 'mg-modal-file' });
		fileBadge.createSpan({ text: 'Not: ', cls: 'mg-modal-file-label' });
		fileBadge.createSpan({
			text: this.file.basename,
			cls: 'mg-modal-file-name',
		});

		let nameInput: TextComponent | null = null;
		const nameSetting = new Setting(contentEl)
			.setName('Sürüm adı')
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
			.setName('Bu dosya için otomatik isimlendirme')
			.setDesc(
				'Sürüm adı boş bırakıldığında ve hızlı kayıtta kullanılacak biçim.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('date', 'Tarih ve saat (GG.AA.YYYY SS:DD)')
					.addOption('sequence', 'Sıralı numara (v1, v2, v3...)')
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
			.setName('Açıklama')
			.setDesc('İsteğe bağlı olarak bu sürümde neler değiştiğini yazın.')
			.addTextArea((area) => {
				area.setPlaceholder('Örn. Giriş bölümü yeniden düzenlendi')
					.onChange((value) => {
						this.descriptionValue = value;
					});
				area.inputEl.rows = 3;
				area.inputEl.addClass('mg-textarea-full');
			});

		const actionsEl = contentEl.createDiv({ cls: 'mg-modal-actions' });

		const cancelBtn = actionsEl.createEl('button', {
			text: 'İptal',
			cls: 'mg-btn-secondary',
		});
		cancelBtn.type = 'button';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const saveBtn = actionsEl.createEl('button', {
			text: 'Kaydet',
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
			return `Boş bırakırsanız otomatik olarak "${this.sequencePlaceholder}" atanır.`;
		}
		return `Boş bırakırsanız tarih ve saat etiketi ("${this.datePlaceholder}") atanır.`;
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
				new Notice('Sürüm kaydedildi.');
				this.onSaved?.(new Date());
				this.close();
			} else if (result.reason === 'duplicate') {
				new Notice('Son sürümden bu yana değişiklik yok.');
				this.close();
			} else {
				new Notice('Bu dosya türü desteklenmiyor.');
			}
		} catch (error) {
			console.error('Metin Giti sürüm kaydetme hatası:', error);
			new Notice('Sürüm kaydedilirken bir hata oluştu.');
		} finally {
			this.isSaving = false;
			saveBtn.disabled = false;
		}
	}
}
