import { ArrayChange, Change, diffArrays, diffWords } from 'diff';
import { MarkdownSection, parseMarkdownSections } from './markdown-sections';

export type SectionDiffStatus = 'changed' | 'removed' | 'added' | 'unchanged';

export interface SectionDiffItem {
	key: string;
	title: string;
	level: number;
	status: SectionDiffStatus;
	oldSection: MarkdownSection | null;
	newSection: MarkdownSection | null;
	lineChanges: ArrayChange<string>[];
}

export interface SplitDiffCell {
	kind: 'context' | 'added' | 'removed' | 'spacer';
	lineNumber: number | null;
	text: string;
	wordChanges?: Change[];
}

export interface SplitDiffRow {
	left: SplitDiffCell;
	right: SplitDiffCell;
}

/**
 * Compares two Markdown documents section-by-section using heading keys.
 */
export function computeSectionDiff(
	oldMarkdown: string,
	newMarkdown: string,
): SectionDiffItem[] {
	const oldSections = parseMarkdownSections(oldMarkdown);
	const newSections = parseMarkdownSections(newMarkdown);

	const newByKey = new Map<string, MarkdownSection>();
	for (const section of newSections) {
		newByKey.set(section.key, section);
	}

	const oldKeys = new Set(oldSections.map((s) => s.key));
	const matchedNewKeys = new Set<string>();
	const result: SectionDiffItem[] = [];

	let newCursor = 0;
	const flushAddedBefore = (targetNewKey: string | null) => {
		while (newCursor < newSections.length) {
			const candidate = newSections[newCursor];
			if (!candidate) {
				break;
			}
			if (targetNewKey !== null && candidate.key === targetNewKey) {
				newCursor += 1;
				break;
			}
			if (!oldKeys.has(candidate.key) && !matchedNewKeys.has(candidate.key)) {
				matchedNewKeys.add(candidate.key);
				result.push({
					key: candidate.key,
					title: candidate.title,
					level: candidate.level,
					status: 'added',
					oldSection: null,
					newSection: candidate,
					lineChanges: [],
				});
			}
			newCursor += 1;
		}
	};

	for (const oldSec of oldSections) {
		const newSec = newByKey.get(oldSec.key);
		if (!newSec) {
			result.push({
				key: oldSec.key,
				title: oldSec.title,
				level: oldSec.level,
				status: 'removed',
				oldSection: oldSec,
				newSection: null,
				lineChanges: [],
			});
			continue;
		}

		flushAddedBefore(newSec.key);
		matchedNewKeys.add(newSec.key);

		if (oldSec.rawContent === newSec.rawContent) {
			result.push({
				key: oldSec.key,
				title: oldSec.title,
				level: oldSec.level,
				status: 'unchanged',
				oldSection: oldSec,
				newSection: newSec,
				lineChanges: [],
			});
		} else {
			const oldLines = oldSec.rawContent
				.replace(/\r\n/g, '\n')
				.split('\n');
			const newLines = newSec.rawContent
				.replace(/\r\n/g, '\n')
				.split('\n');
			result.push({
				key: oldSec.key,
				title: oldSec.title,
				level: oldSec.level,
				status: 'changed',
				oldSection: oldSec,
				newSection: newSec,
				lineChanges: diffArrays(oldLines, newLines),
			});
		}
	}

	flushAddedBefore(null);
	return result;
}

/**
 * Builds horizontally aligned left (new) and right (old) rows for side-by-side rendering,
 * including word-level diffs for paired modified lines.
 */
export function buildSplitDiffRows(item: SectionDiffItem): SplitDiffRow[] {
	const rows: SplitDiffRow[] = [];
	let leftLine = (item.newSection?.startLine ?? 0) + 1;
	let rightLine = (item.oldSection?.startLine ?? 0) + 1;

	if (item.status === 'unchanged' && item.newSection && item.oldSection) {
		const lines = item.newSection.rawContent.split('\n');
		for (const line of lines) {
			rows.push({
				left: { kind: 'context', lineNumber: leftLine++, text: line },
				right: { kind: 'context', lineNumber: rightLine++, text: line },
			});
		}
		return rows;
	}

	const changes = item.lineChanges;
	for (let i = 0; i < changes.length; i++) {
		const current = changes[i];
		if (!current) {
			continue;
		}

		if (current.removed) {
			const next = changes[i + 1];
			const removedLines = current.value;

			if (next && next.added) {
				const addedLines = next.value;
				const maxLen = Math.max(removedLines.length, addedLines.length);

				for (let j = 0; j < maxLen; j++) {
					const oldText = removedLines[j];
					const newText = addedLines[j];

					if (oldText !== undefined && newText !== undefined) {
						const words = diffWords(oldText, newText);
						rows.push({
							left: {
								kind: 'added',
								lineNumber: leftLine++,
								text: newText,
								wordChanges: words,
							},
							right: {
								kind: 'removed',
								lineNumber: rightLine++,
								text: oldText,
								wordChanges: words,
							},
						});
					} else if (newText !== undefined) {
						rows.push({
							left: {
								kind: 'added',
								lineNumber: leftLine++,
								text: newText,
							},
							right: { kind: 'spacer', lineNumber: null, text: '' },
						});
					} else if (oldText !== undefined) {
						rows.push({
							left: { kind: 'spacer', lineNumber: null, text: '' },
							right: {
								kind: 'removed',
								lineNumber: rightLine++,
								text: oldText,
							},
						});
					}
				}
				i += 1;
				continue;
			}

			for (const oldText of removedLines) {
				rows.push({
					left: { kind: 'spacer', lineNumber: null, text: '' },
					right: {
						kind: 'removed',
						lineNumber: rightLine++,
						text: oldText,
					},
				});
			}
			continue;
		}

		if (current.added) {
			for (const newText of current.value) {
				rows.push({
					left: {
						kind: 'added',
						lineNumber: leftLine++,
						text: newText,
					},
					right: { kind: 'spacer', lineNumber: null, text: '' },
				});
			}
			continue;
		}

		for (const line of current.value) {
			rows.push({
				left: { kind: 'context', lineNumber: leftLine++, text: line },
				right: { kind: 'context', lineNumber: rightLine++, text: line },
			});
		}
	}

	return rows;
}

/**
 * Replaces an existing section in the current Markdown document with oldSection,
 * or appends oldSection to the end if it was removed from the current document.
 */
export function applySectionToCurrentContent(
	currentMarkdown: string,
	oldSection: MarkdownSection,
): string {
	const normalized = currentMarkdown.replace(/\r\n/g, '\n');
	const lines = normalized.split('\n');
	const currentSections = parseMarkdownSections(normalized);
	const target = currentSections.find((s) => s.key === oldSection.key);

	if (target) {
		const replacementLines = oldSection.rawContent.split('\n');
		const before = lines.slice(0, target.startLine);
		const after = lines.slice(target.endLine);

		// Preserve a blank separator line before the next section if original had trailing blanks
		const nextStartsWithContent =
			after.length > 0 && (after[0] ?? '').trim().length > 0;
		const replacementEndsBlank =
			replacementLines.length > 0 &&
			(replacementLines[replacementLines.length - 1] ?? '').trim() === '';

		const combined = [...before, ...replacementLines];
		if (nextStartsWithContent && !replacementEndsBlank) {
			combined.push('');
		}
		combined.push(...after);
		return combined.join('\n');
	}

	const trimmedCurrent = normalized.replace(/\n+$/, '');
	if (trimmedCurrent.length === 0) {
		return oldSection.rawContent;
	}
	return `${trimmedCurrent}\n\n${oldSection.rawContent}\n`;
}
