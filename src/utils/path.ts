import { normalizePath } from 'obsidian';

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
