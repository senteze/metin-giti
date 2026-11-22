import { App, Modal } from 'obsidian';
import { VersionMeta } from '../types';
import { formatDateTimeLabel } from '../utils/date';

export class RestoreConfirmModal extends Modal {
	private readonly fileName: string;
	private readonly version: VersionMeta;
	private readonly onConfirm: () => Promise<void>;
	private isRestoring = false;

	constructor(
		app: App,
		fileName: string,
		version: VersionMeta,
		onConfirm: () => Promise<void>,
	) {
		super(app);
		this.fileName = fileName;
		this.version = version;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-modal');

		const headerEl = contentEl.createDiv({ cls: 'mg-modal-header' });
		headerEl.createEl('h2', { text: 'Eski Haline Dön' });

		const bodyEl = contentEl.createDiv({ cls: 'mg-confirm-body' });
		const dateText = formatDateTimeLabel(new Date(this.version.createdAt));

		const msgEl = bodyEl.createEl('p', { cls: 'mg-confirm-message' });
		msgEl.createSpan({ text: `"${this.fileName}" notunu ` });
		msgEl.createEl('strong', { text: this.version.label });
		msgEl.createSpan({
			text: ` (${dateText}) sürümüne döndürmek istediğinizden emin misiniz?`,
		});

		bodyEl.createEl('p', {
			text: 'Güvenliğiniz için mevcut içerik önce sessizce otomatik yedek olarak kaydedilecektir.',
			cls: 'mg-confirm-note',
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

		const confirmBtn = actionsEl.createEl('button', {
			text: 'Eski Haline Dön',
			cls: 'mod-cta mg-btn-primary',
		});
		confirmBtn.type = 'button';
		confirmBtn.addEventListener('click', () => {
			void this.handleConfirm(confirmBtn);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async handleConfirm(confirmBtn: HTMLButtonElement): Promise<void> {
		if (this.isRestoring) {
			return;
		}
		this.isRestoring = true;
		confirmBtn.disabled = true;

		try {
			await this.onConfirm();
			this.close();
		} finally {
			this.isRestoring = false;
			confirmBtn.disabled = false;
		}
	}
}
