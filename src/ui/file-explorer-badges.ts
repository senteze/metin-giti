import { App, TFile } from 'obsidian';
import { t } from '../i18n';
import { VersionStore } from '../storage/version-store';
import { VersionCountSummary } from '../types';

const BADGE_CLASS = 'mg-explorer-badge';
const AUTO_ONLY_CLASS = 'mg-explorer-badge-auto-only';
const OBSERVER_DEBOUNCE_MS = 120;

export class FileExplorerBadges {
	private readonly app: App;
	private readonly store: VersionStore;
	private readonly onBadgeClick: (file: TFile) => void;

	private enabled: boolean;
	private observers: Map<HTMLElement, MutationObserver> = new Map();
	private debounceTimer: number | null = null;

	constructor(
		app: App,
		store: VersionStore,
		enabled: boolean,
		onBadgeClick: (file: TFile) => void,
	) {
		this.app = app;
		this.store = store;
		this.enabled = enabled;
		this.onBadgeClick = onBadgeClick;
	}

	start(): void {
		if (!this.enabled) {
			return;
		}
		this.attachObservers();
		this.renderAllBadges();
	}

	configure(enabled: boolean): void {
		this.enabled = enabled;
		if (!this.enabled) {
			this.clearDebounce();
			this.disconnectObservers();
			this.removeAllBadges();
			return;
		}
		this.attachObservers();
		this.renderAllBadges();
	}

	refresh(): void {
		if (!this.enabled) {
			return;
		}
		this.attachObservers();
		this.renderAllBadges();
	}

	destroy(): void {
		this.clearDebounce();
		this.disconnectObservers();
		this.removeAllBadges();
	}

	private attachObservers(): void {
		const containers = this.getExplorerContainers();
		const activeSet = new Set(containers);

		for (const [el, observer] of this.observers.entries()) {
			if (!activeSet.has(el)) {
				observer.disconnect();
				this.observers.delete(el);
			}
		}

		for (const container of containers) {
			if (this.observers.has(container)) {
				continue;
			}
			const observer = new MutationObserver((mutations) => {
				if (!this.enabled || !this.hasRelevantMutation(mutations)) {
					return;
				}
				this.scheduleRefresh();
			});
			observer.observe(container, {
				childList: true,
				subtree: true,
			});
			this.observers.set(container, observer);
		}
	}

	private hasRelevantMutation(mutations: MutationRecord[]): boolean {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (
					node instanceof HTMLElement &&
					!node.hasClass(BADGE_CLASS)
				) {
					return true;
				}
			}
			for (const node of Array.from(mutation.removedNodes)) {
				if (
					node instanceof HTMLElement &&
					!node.hasClass(BADGE_CLASS)
				) {
					return true;
				}
			}
		}
		return false;
	}

	private scheduleRefresh(): void {
		this.clearDebounce();
		this.debounceTimer = window.setTimeout(() => {
			this.debounceTimer = null;
			if (this.enabled) {
				this.renderAllBadges();
			}
		}, OBSERVER_DEBOUNCE_MS);
	}

	private clearDebounce(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	private disconnectObservers(): void {
		for (const observer of this.observers.values()) {
			observer.disconnect();
		}
		this.observers.clear();
	}

	private getExplorerContainers(): HTMLElement[] {
		const leaves = this.app.workspace.getLeavesOfType('file-explorer');
		const containers: HTMLElement[] = [];
		for (const leaf of leaves) {
			if (leaf.view?.containerEl) {
				containers.push(leaf.view.containerEl);
			}
		}
		return containers;
	}

	private renderAllBadges(): void {
		for (const container of this.getExplorerContainers()) {
			const titleEls = container.querySelectorAll<HTMLElement>(
				'.nav-file-title[data-path]',
			);
			for (const titleEl of Array.from(titleEls)) {
				this.syncBadgeForElement(titleEl);
			}
		}
	}

	private syncBadgeForElement(titleEl: HTMLElement): void {
		const filePath = titleEl.getAttribute('data-path');
		const existing = titleEl.querySelector<HTMLElement>(`.${BADGE_CLASS}`);

		if (!filePath || !filePath.toLowerCase().endsWith('.md')) {
			existing?.remove();
			return;
		}

		const summary = this.store.getCachedSummary(filePath);
		if (!summary || (summary.manualCount === 0 && summary.autoCount === 0)) {
			existing?.remove();
			return;
		}

		const badgeText =
			summary.manualCount > 0 ? String(summary.manualCount) : '•';
		const isAutoOnly = summary.manualCount === 0;
		const tooltip = this.formatTooltip(summary);

		if (existing) {
			if (existing.textContent !== badgeText) {
				existing.setText(badgeText);
			}
			existing.toggleClass(AUTO_ONLY_CLASS, isAutoOnly);
			if (existing.getAttribute('title') !== tooltip) {
				existing.setAttribute('title', tooltip);
				existing.setAttribute('aria-label', tooltip);
			}
			return;
		}

		const badgeEl = titleEl.createSpan({
			cls: isAutoOnly ? `${BADGE_CLASS} ${AUTO_ONLY_CLASS}` : BADGE_CLASS,
			text: badgeText,
		});
		badgeEl.setAttribute('title', tooltip);
		badgeEl.setAttribute('aria-label', tooltip);
		badgeEl.addEventListener('click', (evt) => {
			evt.stopPropagation();
			evt.preventDefault();
			const targetPath = titleEl.getAttribute('data-path');
			if (!targetPath) {
				return;
			}
			const abstractFile =
				this.app.vault.getAbstractFileByPath(targetPath);
			if (abstractFile instanceof TFile) {
				this.onBadgeClick(abstractFile);
			}
		});
	}

	private formatTooltip(summary: VersionCountSummary): string {
		const parts: string[] = [];
		if (summary.manualCount > 0) {
			parts.push(
				t('badgeManualCount', { count: summary.manualCount }),
			);
		}
		if (summary.autoCount > 0) {
			parts.push(t('badgeAutoCount', { count: summary.autoCount }));
		}
		return parts.join(', ');
	}

	private removeAllBadges(): void {
		for (const container of this.getExplorerContainers()) {
			const badges = container.querySelectorAll(`.${BADGE_CLASS}`);
			for (const badge of Array.from(badges)) {
				badge.remove();
			}
		}
	}
}
