import { t } from '../i18n';

export interface MarkdownSection {
	key: string;
	title: string;
	headingLine: string;
	level: number;
	rawContent: string;
	startLine: number;
	endLine: number;
}

const HEADING_REGEX = /^(#{1,4})\s+(.+?)\s*$/;
const FENCE_REGEX = /^(\s*)(`{3,}|~{3,})/;

/**
 * Splits a Markdown document into sections by headings (# through ####),
 * ignoring heading-like lines inside fenced code blocks.
 * Any content before the first heading is returned as "Giriş / Başlıksız Bölüm".
 */
export function parseMarkdownSections(markdown: string): MarkdownSection[] {
	const normalized = markdown.replace(/\r\n/g, '\n');
	const lines = normalized.split('\n');

	const rawBlocks: Array<{
		baseKey: string;
		title: string;
		headingLine: string;
		level: number;
		startLine: number;
		endLine: number;
	}> = [];

	let currentStart = 0;
	let currentHeadingLine = '';
	let currentTitle = t('introSectionTitle');
	let currentBaseKey = '__intro__';
	let currentLevel = 0;
	let inFence = false;
	let fenceChar = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		const fenceMatch = FENCE_REGEX.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[2] ?? '';
			const char = marker[0] ?? '';
			if (!inFence) {
				inFence = true;
				fenceChar = char;
			} else if (char === fenceChar) {
				inFence = false;
				fenceChar = '';
			}
			continue;
		}

		if (inFence) {
			continue;
		}

		const headingMatch = HEADING_REGEX.exec(line);
		if (headingMatch) {
			if (i > currentStart) {
				const slice = lines.slice(currentStart, i);
				const hasText =
					currentLevel > 0 ||
					slice.some((l) => l.trim().length > 0);
				if (hasText) {
					rawBlocks.push({
						baseKey: currentBaseKey,
						title: currentTitle,
						headingLine: currentHeadingLine,
						level: currentLevel,
						startLine: currentStart,
						endLine: i,
					});
				}
			}

			const hashes = headingMatch[1] ?? '#';
			const headingText = (headingMatch[2] ?? '').trim();
			currentLevel = hashes.length;
			currentHeadingLine = line;
			currentTitle = headingText;
			currentBaseKey = `${hashes} ${headingText}`;
			currentStart = i;
		}
	}

	if (lines.length > currentStart) {
		const slice = lines.slice(currentStart);
		const hasText =
			currentLevel > 0 || slice.some((l) => l.trim().length > 0);
		if (hasText) {
			rawBlocks.push({
				baseKey: currentBaseKey,
				title: currentTitle,
				headingLine: currentHeadingLine,
				level: currentLevel,
				startLine: currentStart,
				endLine: lines.length,
			});
		}
	}

	const occurrenceCounts = new Map<string, number>();
	return rawBlocks.map((block) => {
		const count = (occurrenceCounts.get(block.baseKey) ?? 0) + 1;
		occurrenceCounts.set(block.baseKey, count);
		const key = count === 1 ? block.baseKey : `${block.baseKey}::${count}`;
		const rawContent = lines
			.slice(block.startLine, block.endLine)
			.join('\n')
			.replace(/\n+$/, '');

		return {
			key,
			title: block.title,
			headingLine: block.headingLine,
			level: block.level,
			rawContent,
			startLine: block.startLine,
			endLine: block.endLine,
		};
	});
}
