import { moment } from 'obsidian';
import { en } from './en';
import { TranslationKey, tr } from './tr';

export type LanguagePreference = 'auto' | 'tr' | 'en';
export type ResolvedLanguage = 'tr' | 'en';
export type { TranslationKey };

let languagePreference: LanguagePreference = 'auto';

export function setLanguagePreference(pref: LanguagePreference): void {
	languagePreference = pref;
}

export function getResolvedLanguage(): ResolvedLanguage {
	if (languagePreference === 'tr' || languagePreference === 'en') {
		return languagePreference;
	}
	const locale = moment.locale();
	return typeof locale === 'string' && locale.toLowerCase().startsWith('tr')
		? 'tr'
		: 'en';
}

/**
 * Returns the localized string for the given key, interpolating any {param} placeholders.
 */
export function t(
	key: TranslationKey,
	params?: Record<string, string | number>,
): string {
	const dict = getResolvedLanguage() === 'tr' ? tr : en;
	let text: string = dict[key];

	if (params) {
		for (const [paramKey, paramValue] of Object.entries(params)) {
			text = text.replace(
				new RegExp(`\\{${paramKey}\\}`, 'g'),
				String(paramValue),
			);
		}
	}

	return text;
}
