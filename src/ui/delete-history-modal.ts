import { App, Modal } from 'obsidian';

export class DeleteHistoryModal extends Modal {
	private readonly fileName: string;
	private readonly versionCount: number;
	private readonly onConfirmDelete: () => Promise<void>;
	private isDeleting = false;

	constructor(
		app: App,
		fileName: string,
		versionCount: number,
		onConfirmDelete: () => Promise<void>,
	) {
		super(app);
		this.fileName = fileName;
		this.versionCount = versionCount;
		this.onConfirmDelete = onConfirmDelete;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-modal');

		const headerEl = contentEl.createDiv({ cls: 'mg-modal-header' });
		headerEl.createEl('h2', { text: 'Sürüm Geçmişi Silinsin mi?' });

		const bodyEl = contentEl.createDiv({ cls: 'mg-confirm-body' });
		const msgEl = bodyEl.createEl('p', { cls: 'mg-confirm-message' });
		msgEl.createEl('strong', { text: this.fileName });
		msgEl.createSpan({
			text: ` silindi. Bu dosyaya ait ${this.versionCount} adet kayıtlı sürüm geçmişi de kalıcı olarak silinsin mi?`,
		});

		const actionsEl = contentEl.createDiv({ cls: 'mg-modal-actions' });

		const keepBtn = actionsEl.createEl('button', {
			text: 'Geçmişi Koru',
			cls: 'mg-btn-secondary',
		});
		keepBtn.type = 'button';
		keepBtn.addEventListener('click', () => {
			this.close();
		});

		const deleteBtn = actionsEl.createEl('button', {
			text: 'Geçmişi de Sil',
			cls: 'mod-warning mg-btn-danger',
		});
		deleteBtn.type = 'button';
		deleteBtn.addEventListener('click', () => {
			void this.handleDelete(deleteBtn);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async handleDelete(deleteBtn: HTMLButtonElement): Promise<void> {
		if (this.isDeleting) {
			return;
		}
		this.isDeleting = true;
		deleteBtn.disabled = true;

		try {
			await this.onConfirmDelete();
			this.close();
		} finally {
			this.isDeleting = false;
			deleteBtn.disabled = false;
		}
	}
}
