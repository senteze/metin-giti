import { App, Modal } from 'obsidian';
import { t } from '../i18n';

export class DeleteVersionModal extends Modal {
	private readonly versionLabel: string;
	private readonly onConfirmDelete: () => Promise<void>;
	private isDeleting = false;

	constructor(
		app: App,
		versionLabel: string,
		onConfirmDelete: () => Promise<void>,
	) {
		super(app);
		this.versionLabel = versionLabel;
		this.onConfirmDelete = onConfirmDelete;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-modal');

		const headerEl = contentEl.createDiv({ cls: 'mg-modal-header' });
		headerEl.createEl('h2', { text: t('modalDeleteVersionTitle') });

		const bodyEl = contentEl.createDiv({ cls: 'mg-confirm-body' });
		bodyEl.createEl('p', {
			text: t('modalDeleteVersionMessage', { label: this.versionLabel }),
			cls: 'mg-confirm-message',
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

		const deleteBtn = actionsEl.createEl('button', {
			text: t('btnDelete'),
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
