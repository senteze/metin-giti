import { App, TAbstractFile, normalizePath } from 'obsidian';

/**
 * Normalizes a user-entered file or folder path for tracked-path storage.
 * Preserves a trailing slash for explicit folder paths if provided.
 */
export function normalizeTrackedEntry(raw: string): string {
	const trimmed = raw.trim().replace(/\\/g, '/').replace(/^\/+/, '');
	if (trimmed.length === 0) {
		return '';
	}
	const hasTrailingSlash = trimmed.endsWith('/');
	const normalized = normalizePath(trimmed);
	if (hasTrailingSlash && !normalized.endsWith('/') && normalized !== '/') {
		return `${normalized}/`;
	}
	return normalized;
}

/**
 * Resolves a tracked entry (file or folder, with or without trailing slash) against the vault.
 */
export function resolveVaultItem(
	app: App,
	entry: string,
): TAbstractFile | null {
	const normalized = normalizeTrackedEntry(entry);
	if (!normalized) {
		return null;
	}
	const lookupPath =
		normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
	return app.vault.getAbstractFileByPath(lookupPath);
}

/**
 * Returns true if the given Markdown file path matches any tracked file or folder entry.
 */
export function matchesTrackedPath(
	filePath: string,
	trackedEntries: Iterable<string>,
): boolean {
	const normalizedFile = normalizePath(filePath);
	for (const rawEntry of trackedEntries) {
		const entry = normalizeTrackedEntry(rawEntry);
		if (!entry) {
			continue;
		}
		if (entry.toLowerCase().endsWith('.md')) {
			if (normalizedFile === entry) {
				return true;
			}
			continue;
		}
		const folderPrefix =
			entry === '/' ? '' : `${entry.replace(/\/+$/, '')}/`;
		if (folderPrefix === '' || normalizedFile.startsWith(folderPrefix)) {
			return true;
		}
	}
	return false;
}

/**
 * Returns true if a vault folder is covered by any tracked folder entry.
 */
export function isFolderTracked(
	folderPath: string,
	trackedEntries: Iterable<string>,
): boolean {
	const normalizedFolder = normalizePath(folderPath).replace(/\/+$/, '');
	if (!normalizedFolder || normalizedFolder === '/') {
		return false;
	}

	for (const rawEntry of trackedEntries) {
		const entry = normalizeTrackedEntry(rawEntry);
		if (!entry || entry.toLowerCase().endsWith('.md')) {
			continue;
		}
		if (entry === '/') {
			return true;
		}
		const cleanEntry = entry.replace(/\/+$/, '');
		if (
			normalizedFolder === cleanEntry ||
			normalizedFolder.startsWith(`${cleanEntry}/`)
		) {
			return true;
		}
	}
	return false;
}
