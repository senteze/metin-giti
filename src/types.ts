import type { LanguagePreference } from './i18n';

export type VersionKind = 'manual' | 'auto';

export type TrackingMode = 'all' | 'tracked-only';

export type FileNamingMode = 'date' | 'sequence';

export interface VersionMeta {
	id: string;
	kind: VersionKind;
	label: string;
	description: string;
	createdAt: string;
	hash: string;
	size: number;
}

export interface DocHistoryMeta {
	docId: string;
	filePath: string;
	namingMode?: FileNamingMode;
	versions: VersionMeta[];
}

export type IndexMap = Record<string, string>;

export interface SaveVersionOptions {
	kind: VersionKind;
	label?: string;
	description?: string;
	namingMode?: FileNamingMode;
}

export interface SaveVersionResult {
	saved: boolean;
	reason?: 'duplicate' | 'unsupported';
	version?: VersionMeta;
}

export interface VersionCountSummary {
	manualCount: number;
	autoCount: number;
}

export interface MetinGitiSettings {
	language: LanguagePreference;
	autoBackupEnabled: boolean;
	autoBackupIntervalMinutes: number;
	trackingMode: TrackingMode;
	trackedFiles: string[];
	namingFormat: FileNamingMode;
	showExplorerBadges: boolean;
}
