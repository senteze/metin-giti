import { ItemView, Notice, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import {
	SectionDiffItem,
	SectionDiffStatus,
	SplitDiffCell,
	applySectionToCurrentContent,
	buildSplitDiffRows,
	computeSectionDiff,
} from '../diff/section-diff';
import { t } from '../i18n';
import { VersionStore } from '../storage/version-store';
import { VersionMeta } from '../types';
import { computeContentHash } from '../utils/hash';

export const DIFF_VIEW_TYPE = 'metin-giti-diff';
export const CURRENT_SIDE_ID = '__current__';

export interface DiffViewCallbacks {
	onBeforeRestore: (file: TFile, restoredHash: string) => void;
	onContentUpdated: () => void;
}

interface DiffTarget {
	file: TFile;
	leftId: string;
	rightId: string;
}

type DiffLayoutMode = 'split' | 'unified';

export class DiffView extends ItemView {
	private readonly store: VersionStore;
	private readonly callbacks: DiffViewCallbacks;
	private target: DiffTarget | null = null;
	private showUnchanged = false;
	private layoutMode: DiffLayoutMode = 'split';
	private renderToken = 0;

	constructor(
		leaf: WorkspaceLeaf,
		store: VersionStore,
		callbacks: DiffViewCallbacks,
	) {
		super(leaf);
		this.store = store;
		this.callbacks = callbacks;
	}

	getViewType(): string {
		return DIFF_VIEW_TYPE;
	}

	getDisplayText(): string {
		if (this.target) {
			return t('diffTabTitle', { basename: this.target.file.basename });
		}
		return t('diffDisplayText');
	}

	getIcon(): string {
		return 'git-compare';
	}

	/**
	 * Left column defaults to CURRENT_SIDE_ID (new/current), right column to the selected old version.
	 */
	async setTarget(
		file: TFile,
		leftId: string,
		rightId: string,
	): Promise<void> {
		this.target = { file, leftId, rightId };
		await this.refresh();
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.renderToken += 1;
		this.target = null;
		this.contentEl.empty();
	}

	async refresh(): Promise<void> {
		const token = ++this.renderToken;
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mg-diff-root');

		if (!this.target) {
			const emptyEl = contentEl.createDiv({ cls: 'mg-diff-empty' });
			emptyEl.createEl('p', {
				text: t('diffEmptySelect'),
			});
			return;
		}

		const currentFile = this.app.vault.getAbstractFileByPath(
			this.target.file.path,
		);
		if (!(currentFile instanceof TFile)) {
			const emptyEl = contentEl.createDiv({ cls: 'mg-diff-empty' });
			emptyEl.createEl('p', {
				text: t('diffEmptyMissingFile'),
			});
			return;
		}

		const [history, currentContent] = await Promise.all([
			this.store.getFileHistory(currentFile),
			this.app.vault.read(currentFile),
		]);
		if (token !== this.renderToken) {
			return;
		}

		const versions = history?.versions ?? [];
		const leftResolved = await this.resolveSide(
			currentFile,
			this.target.leftId,
			versions,
			currentContent,
		);
		const rightResolved = await this.resolveSide(
			currentFile,
			this.target.rightId,
			versions,
			currentContent,
		);
		if (token !== this.renderToken) {
			return;
		}

		if (leftResolved.content === null || rightResolved.content === null) {
			const emptyEl = contentEl.createDiv({ cls: 'mg-diff-empty' });
			emptyEl.createEl('p', {
				text: t('diffEmptyReadError'),
			});
			return;
		}

		const diffItems = computeSectionDiff(
			rightResolved.content,
			leftResolved.content,
		);
		this.renderHeader(
			contentEl,
			currentFile,
			versions,
			leftResolved.label,
			rightResolved.label,
			diffItems,
		);
		this.renderSections(
			contentEl,
			currentFile,
			leftResolved.label,
			rightResolved.label,
			diffItems,
		);
	}

	private async resolveSide(
		file: TFile,
		sideId: string,
		versions: VersionMeta[],
		currentContent: string,
	): Promise<{ label: string; content: string | null }> {
		if (sideId === CURRENT_SIDE_ID) {
			return { label: t('labelCurrentVersion'), content: currentContent };
		}

		const meta = versions.find((v) => v.id === sideId);
		if (!meta) {
			return { label: t('diffUnknownVersion'), content: null };
		}

		const content = await this.store.readVersionContent(file, meta.id);
		return { label: meta.label, content };
	}

	private renderHeader(
		containerEl: HTMLElement,
		file: TFile,
		versions: VersionMeta[],
		leftLabel: string,
		rightLabel: string,
		items: SectionDiffItem[],
	): void {
		const headerEl = containerEl.createDiv({ cls: 'mg-diff-header' });

		const titleEl = headerEl.createDiv({ cls: 'mg-diff-title' });
		titleEl.setText(
			t('diffHeaderTitle', {
				fileName: file.name,
				leftLabel,
				rightLabel,
			}),
		);

		if (this.target) {
			this.renderSelectors(headerEl, versions, this.target);
		}

		const controlsEl = headerEl.createDiv({ cls: 'mg-diff-controls' });

		const changedCount = items.filter((i) => i.status === 'changed').length;
		const removedCount = items.filter((i) => i.status === 'removed').length;
		const addedCount = items.filter((i) => i.status === 'added').length;
		const unchangedCount = items.filter(
			(i) => i.status === 'unchanged',
		).length;

		const statsEl = controlsEl.createDiv({ cls: 'mg-diff-stats' });
		statsEl.createSpan({
			text: t('diffStatChanged', { count: changedCount }),
			cls: 'mg-diff-stat mg-stat-changed',
		});
		statsEl.createSpan({
			text: t('diffStatRemoved', { count: removedCount }),
			cls: 'mg-diff-stat mg-stat-removed',
		});
		statsEl.createSpan({
			text: t('diffStatAdded', { count: addedCount }),
			cls: 'mg-diff-stat mg-stat-added',
		});

		const rightControls = controlsEl.createDiv({
			cls: 'mg-diff-right-controls',
		});

		const layoutSwitch = rightControls.createDiv({
			cls: 'mg-diff-layout-switch',
		});
		const splitBtn = layoutSwitch.createEl('button', {
			text: t('diffLayoutSplit'),
			cls:
				this.layoutMode === 'split'
					? 'mg-btn-compact mod-cta'
					: 'mg-btn-compact',
		});
		splitBtn.type = 'button';
		splitBtn.addEventListener('click', () => {
			if (this.layoutMode !== 'split') {
				this.layoutMode = 'split';
				void this.refresh();
			}
		});

		const unifiedBtn = layoutSwitch.createEl('button', {
			text: t('diffLayoutUnified'),
			cls:
				this.layoutMode === 'unified'
					? 'mg-btn-compact mod-cta'
					: 'mg-btn-compact',
		});
		unifiedBtn.type = 'button';
		unifiedBtn.addEventListener('click', () => {
			if (this.layoutMode !== 'unified') {
				this.layoutMode = 'unified';
				void this.refresh();
			}
		});

		const toggleLabel = rightControls.createEl('label', {
			cls: 'mg-diff-toggle-label',
		});
		const checkbox = toggleLabel.createEl('input', {
			type: 'checkbox',
			cls: 'mg-diff-toggle-checkbox',
		});
		checkbox.checked = this.showUnchanged;
		checkbox.addEventListener('change', () => {
			this.showUnchanged = checkbox.checked;
			void this.refresh();
		});
		toggleLabel.createSpan({
			text: t('diffShowUnchanged', { count: unchangedCount }),
		});
	}

	private renderSelectors(
		headerEl: HTMLElement,
		versions: VersionMeta[],
		target: DiffTarget,
	): void {
		const rowEl = headerEl.createDiv({ cls: 'mg-diff-selectors' });

		const leftWrap = rowEl.createDiv({ cls: 'mg-diff-select-group' });
		leftWrap.createSpan({
			text: t('diffLeftSelectorLabel'),
			cls: 'mg-diff-select-label',
		});
		const leftSelect = leftWrap.createEl('select', {
			cls: 'dropdown mg-diff-select',
		});
		const leftCurrentOpt = leftSelect.createEl('option', {
			value: CURRENT_SIDE_ID,
			text: t('labelCurrentVersion'),
		});
		if (target.leftId === CURRENT_SIDE_ID) {
			leftCurrentOpt.selected = true;
		}
		for (const v of versions) {
			const opt = leftSelect.createEl('option', {
				value: v.id,
				text: this.formatOptionLabel(v),
			});
			if (v.id === target.leftId) {
				opt.selected = true;
			}
		}
		leftSelect.addEventListener('change', () => {
			if (this.target) {
				this.target.leftId = leftSelect.value;
				void this.refresh();
			}
		});

		const swapBtn = rowEl.createEl('button', {
			cls: 'mg-diff-swap-btn',
		});
		swapBtn.type = 'button';
		swapBtn.setAttribute('aria-label', t('diffSwapLabel'));
		swapBtn.setAttribute('title', t('diffSwapLabel'));
		setIcon(swapBtn, 'arrow-left-right');
		swapBtn.addEventListener('click', () => {
			if (this.target) {
				const prevLeft = this.target.leftId;
				this.target.leftId = this.target.rightId;
				this.target.rightId = prevLeft;
				void this.refresh();
			}
		});

		const rightWrap = rowEl.createDiv({ cls: 'mg-diff-select-group' });
		rightWrap.createSpan({
			text: t('diffRightSelectorLabel'),
			cls: 'mg-diff-select-label',
		});
		const rightSelect = rightWrap.createEl('select', {
			cls: 'dropdown mg-diff-select',
		});
		for (const v of versions) {
			const opt = rightSelect.createEl('option', {
				value: v.id,
				text: this.formatOptionLabel(v),
			});
			if (v.id === target.rightId) {
				opt.selected = true;
			}
		}
		const rightCurrentOpt = rightSelect.createEl('option', {
			value: CURRENT_SIDE_ID,
			text: t('labelCurrentVersion'),
		});
		if (target.rightId === CURRENT_SIDE_ID) {
			rightCurrentOpt.selected = true;
		}
		rightSelect.addEventListener('change', () => {
			if (this.target) {
				this.target.rightId = rightSelect.value;
				void this.refresh();
			}
		});
	}

	private formatOptionLabel(version: VersionMeta): string {
		return version.kind === 'auto'
			? t('autoBackupCardTitle', { label: version.label })
			: version.label;
	}

	private renderSections(
		containerEl: HTMLElement,
		file: TFile,
		leftLabel: string,
		rightLabel: string,
		items: SectionDiffItem[],
	): void {
		const bodyEl = containerEl.createDiv({ cls: 'mg-diff-sections' });

		const visibleItems = this.showUnchanged
			? items
			: items.filter((item) => item.status !== 'unchanged');

		if (visibleItems.length === 0) {
			const emptyEl = bodyEl.createDiv({ cls: 'mg-diff-empty' });
			emptyEl.createEl('p', {
				text: t('diffNoDifferences'),
			});
			return;
		}

		for (const item of visibleItems) {
			this.renderSectionCard(
				bodyEl,
				file,
				leftLabel,
				rightLabel,
				item,
			);
		}
	}

	private renderSectionCard(
		containerEl: HTMLElement,
		file: TFile,
		leftLabel: string,
		rightLabel: string,
		item: SectionDiffItem,
	): void {
		const cardEl = containerEl.createDiv({
			cls: `mg-diff-card mg-diff-card-${item.status}`,
		});

		const cardHeader = cardEl.createDiv({ cls: 'mg-diff-card-header' });
		const titleWrap = cardHeader.createDiv({
			cls: 'mg-diff-card-title-wrap',
		});
		titleWrap.createSpan({
			text: item.title,
			cls: 'mg-diff-section-title',
		});
		titleWrap.createSpan({
			text: this.getStatusLabel(item.status),
			cls: `mg-diff-badge mg-diff-badge-${item.status}`,
		});

		if (
			item.oldSection &&
			(item.status === 'changed' || item.status === 'removed')
		) {
			const oldSection = item.oldSection;
			const actionsEl = cardHeader.createDiv({
				cls: 'mg-diff-card-actions',
			});

			const copyBtn = actionsEl.createEl('button', {
				text: t('btnCopySnippet'),
				cls: 'mg-btn-action',
			});
			copyBtn.type = 'button';
			copyBtn.setAttribute(
				'title',
				t('tooltipCopySnippet', { label: rightLabel }),
			);
			copyBtn.addEventListener('click', () => {
				void this.copySection(oldSection.rawContent, rightLabel);
			});

			const applyBtn = actionsEl.createEl('button', {
				text: t('btnApplySnippet'),
				cls: 'mod-cta mg-btn-action',
			});
			applyBtn.type = 'button';
			applyBtn.setAttribute(
				'title',
				t('tooltipApplySnippet', { label: rightLabel }),
			);
			applyBtn.addEventListener('click', () => {
				void this.applySection(
					file,
					item.title,
					rightLabel,
					oldSection,
				);
			});
		}

		if (this.layoutMode === 'split') {
			this.renderSplitBody(cardEl, leftLabel, rightLabel, item);
		} else {
			const linesEl = cardEl.createDiv({ cls: 'mg-diff-lines' });
			this.renderUnifiedLines(linesEl, item);
		}
	}

	private renderSplitBody(
		cardEl: HTMLElement,
		leftLabel: string,
		rightLabel: string,
		item: SectionDiffItem,
	): void {
		const splitWrap = cardEl.createDiv({ cls: 'mg-diff-split-wrap' });

		const colHeaders = splitWrap.createDiv({
			cls: 'mg-diff-split-grid mg-diff-split-header',
		});
		colHeaders.createDiv({
			text: leftLabel,
			cls: 'mg-diff-split-col-header mg-diff-split-cell-left',
		});
		colHeaders.createDiv({
			text: rightLabel,
			cls: 'mg-diff-split-col-header mg-diff-split-cell-right',
		});

		if (item.status === 'added' && item.newSection) {
			const grid = splitWrap.createDiv({ cls: 'mg-diff-split-grid' });
			const leftPane = grid.createDiv({
				cls: 'mg-diff-split-pane mg-diff-split-cell-left',
			});
			let lineNum = item.newSection.startLine + 1;
			for (const line of item.newSection.rawContent.split('\n')) {
				this.renderSplitCell(leftPane, {
					kind: 'added',
					lineNumber: lineNum++,
					text: line,
				});
			}

			const rightPane = grid.createDiv({
				cls: 'mg-diff-split-pane mg-diff-split-cell-right mg-diff-split-empty-side',
			});
			rightPane.createSpan({
				text: t('diffSectionAbsentRight'),
				cls: 'mg-diff-split-empty-text',
			});
			return;
		}

		if (item.status === 'removed' && item.oldSection) {
			const grid = splitWrap.createDiv({ cls: 'mg-diff-split-grid' });
			const leftPane = grid.createDiv({
				cls: 'mg-diff-split-pane mg-diff-split-cell-left mg-diff-split-empty-side',
			});
			leftPane.createSpan({
				text: t('diffSectionAbsentLeft'),
				cls: 'mg-diff-split-empty-text',
			});

			const rightPane = grid.createDiv({
				cls: 'mg-diff-split-pane mg-diff-split-cell-right',
			});
			let lineNum = item.oldSection.startLine + 1;
			for (const line of item.oldSection.rawContent.split('\n')) {
				this.renderSplitCell(rightPane, {
					kind: 'removed',
					lineNumber: lineNum++,
					text: line,
				});
			}
			return;
		}

		const rows = buildSplitDiffRows(item);
		for (const row of rows) {
			const rowEl = splitWrap.createDiv({
				cls: 'mg-diff-split-grid mg-diff-split-row',
			});
			const leftCell = rowEl.createDiv({
				cls: 'mg-diff-split-cell-left',
			});
			this.renderSplitCell(leftCell, row.left, 'left');

			const rightCell = rowEl.createDiv({
				cls: 'mg-diff-split-cell-right',
			});
			this.renderSplitCell(rightCell, row.right, 'right');
		}
	}

	private renderSplitCell(
		containerEl: HTMLElement,
		cell: SplitDiffCell,
		side: 'left' | 'right' = 'left',
	): void {
		const cellEl = containerEl.createDiv({
			cls: `mg-diff-split-cell mg-diff-split-${cell.kind}`,
		});

		cellEl.createSpan({
			text: cell.lineNumber !== null ? String(cell.lineNumber) : '',
			cls: 'mg-diff-lineno',
		});

		const textEl = cellEl.createSpan({ cls: 'mg-diff-split-text' });
		if (cell.kind === 'spacer') {
			return;
		}

		if (cell.wordChanges && cell.wordChanges.length > 0) {
			for (const part of cell.wordChanges) {
				if (side === 'left') {
					if (part.removed) {
						continue;
					}
					if (part.added) {
						textEl.createSpan({
							text: part.value,
							cls: 'mg-diff-word-added',
						});
					} else {
						textEl.createSpan({ text: part.value });
					}
				} else {
					if (part.added) {
						continue;
					}
					if (part.removed) {
						textEl.createSpan({
							text: part.value,
							cls: 'mg-diff-word-removed',
						});
					} else {
						textEl.createSpan({ text: part.value });
					}
				}
			}
			return;
		}

		textEl.setText(cell.text);
	}

	private renderUnifiedLines(
		linesEl: HTMLElement,
		item: SectionDiffItem,
	): void {
		if (item.status === 'changed') {
			for (const part of item.lineChanges) {
				const lineClass = part.added
					? 'mg-diff-line-added'
					: part.removed
						? 'mg-diff-line-removed'
						: 'mg-diff-line-context';
				const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
				for (const line of part.value) {
					const row = linesEl.createDiv({
						cls: `mg-diff-line ${lineClass}`,
					});
					row.createSpan({ text: prefix, cls: 'mg-diff-prefix' });
					row.createSpan({ text: line, cls: 'mg-diff-text' });
				}
			}
			return;
		}

		if (item.status === 'removed' && item.oldSection) {
			const rawLines = item.oldSection.rawContent.split('\n');
			for (const line of rawLines) {
				const row = linesEl.createDiv({
					cls: 'mg-diff-line mg-diff-line-removed',
				});
				row.createSpan({ text: '- ', cls: 'mg-diff-prefix' });
				row.createSpan({ text: line, cls: 'mg-diff-text' });
			}
			return;
		}

		if (item.status === 'added' && item.newSection) {
			const rawLines = item.newSection.rawContent.split('\n');
			for (const line of rawLines) {
				const row = linesEl.createDiv({
					cls: 'mg-diff-line mg-diff-line-added',
				});
				row.createSpan({ text: '+ ', cls: 'mg-diff-prefix' });
				row.createSpan({ text: line, cls: 'mg-diff-text' });
			}
			return;
		}

		if (item.newSection) {
			const rawLines = item.newSection.rawContent.split('\n');
			for (const line of rawLines) {
				const row = linesEl.createDiv({
					cls: 'mg-diff-line mg-diff-line-context',
				});
				row.createSpan({ text: '  ', cls: 'mg-diff-prefix' });
				row.createSpan({ text: line, cls: 'mg-diff-text' });
			}
		}
	}

	private getStatusLabel(status: SectionDiffStatus): string {
		switch (status) {
			case 'changed':
				return t('diffStatusChanged');
			case 'removed':
				return t('diffStatusRemoved');
			case 'added':
				return t('diffStatusAdded');
			case 'unchanged':
				return t('diffStatusUnchanged');
		}
	}

	private async copySection(
		content: string,
		rightLabel: string,
	): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			new Notice(t('noticeCopiedSnippet', { label: rightLabel }));
		} catch (error) {
			console.error('Metin Giti clipboard error:', error);
			new Notice(t('noticeCopyError'));
		}
	}

	private async applySection(
		file: TFile,
		sectionTitle: string,
		rightLabel: string,
		oldSection: NonNullable<SectionDiffItem['oldSection']>,
	): Promise<void> {
		try {
			const currentContent = await this.app.vault.read(file);
			const alreadySaved = await this.store.hasContentHash(
				file,
				currentContent,
			);
			if (!alreadySaved) {
				await this.store.saveVersion(file, { kind: 'auto' });
			}

			const updatedContent = applySectionToCurrentContent(
				currentContent,
				oldSection,
			);
			const updatedHash = await computeContentHash(updatedContent);
			this.callbacks.onBeforeRestore(file, updatedHash);
			await this.app.vault.modify(file, updatedContent);

			this.callbacks.onContentUpdated();
			await this.refresh();
			new Notice(
				t('noticeAppliedSnippet', {
					title: sectionTitle,
					label: rightLabel,
				}),
			);
		} catch (error) {
			console.error('Metin Giti apply snippet error:', error);
			new Notice(t('noticeApplyError'));
		}
	}
}
