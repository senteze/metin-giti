import { AbstractInputSuggest, App, TFile, TFolder, setIcon } from 'obsidian';

const MAX_SUGGESTIONS = 30;

export class VaultPathSuggest extends AbstractInputSuggest<string> {
	private readonly onPick?: (value: string) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onPick?: (value: string) => void,
	) {
		super(app, inputEl);
		this.onPick = onPick;
	}

	getSuggestions(query: string): string[] {
		const lowerQuery = query.trim().toLowerCase();
		const candidates: string[] = [];

		for (const item of this.app.vault.getAllLoadedFiles()) {
			if (item instanceof TFolder) {
				if (item.isRoot() || item.path.startsWith('.metin-giti')) {
					continue;
				}
				candidates.push(`${item.path}/`);
			} else if (
				item instanceof TFile &&
				item.extension.toLowerCase() === 'md'
			) {
				candidates.push(item.path);
			}
		}

		const filtered = lowerQuery
			? candidates.filter((path) =>
					path.toLowerCase().includes(lowerQuery),
				)
			: candidates;

		return filtered.slice(0, MAX_SUGGESTIONS);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.addClass('mg-suggest-item');
		const iconEl = el.createSpan({ cls: 'mg-suggest-icon' });
		setIcon(iconEl, value.endsWith('/') ? 'folder' : 'file-text');
		el.createSpan({ text: value, cls: 'mg-suggest-text' });
	}

	selectSuggestion(value: string): void {
		this.setValue(value);
		this.onPick?.(value);
		this.close();
	}
}
