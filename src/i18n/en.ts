import type { TranslationKey } from './tr';

export const en: Record<TranslationKey, string> = {
	// Commands & Ribbon
	cmdShowHistory: 'Show Version History',
	cmdSaveVersion: 'Save Version',
	cmdQuickSave: 'Quick Save',
	cmdToggleTracking: 'Toggle version tracking for this file',

	// Notices
	noticeOpenNoteFirst: 'Please open a note first to save a version.',
	noticeQuickSaved: 'Quick version saved: {label}',
	noticeNoChangesQuick: 'No changes, no new version saved',
	noticeUnsupportedFile: 'This file type is not supported.',
	noticeSaveError: 'An error occurred while saving the version.',
	noticeTrackingDisabled: 'Version tracking disabled for "{name}".',
	noticeTrackingEnabled: 'Version tracking enabled for "{name}".',
	noticeHistoryDeleted: 'File version history deleted',
	noticeVersionSaved: 'Version saved.',
	noticeNoChangesSinceLast: 'No changes since the last version.',

	// Settings
	settingLanguageName: 'Dil / Language',
	settingLanguageDesc: 'Choose the display language for the plugin interface.',
	settingLanguageAuto: 'Auto (Obsidian language)',
	settingLanguageTr: 'Türkçe',
	settingLanguageEn: 'English',
	settingAutoBackupName: 'Auto-backup',
	settingAutoBackupDesc:
		'Silently saves a backup in the background when the active note is modified.',
	settingIntervalName: 'Auto-backup wait time (minutes)',
	settingIntervalDesc:
		'Time to wait after the last edit before taking an auto-backup (at least 1 minute).',
	settingTrackingModeName: 'Tracking mode',
	settingTrackingModeDesc:
		'Choose whether auto-backup runs for all notes or only the notes you select.',
	settingTrackingAll: 'All files',
	settingTrackingOnly: 'Tracked files only',
	settingNamingFormatName: 'Default / Quick save naming format',
	settingNamingFormatDesc:
		'Choose the default label format when no per-file preference is set.',
	namingOptionDate: 'Date and time (DD.MM.YYYY HH:mm)',
	namingOptionSequence: 'Sequential number (v1, v2, v3...)',
	settingExplorerBadgesName: 'Show version badges in file explorer',
	settingExplorerBadgesDesc:
		'Displays a version count badge next to notes with saved history in the file explorer.',

	// Status bar
	statusAutoBackupOff: 'Auto-backup off',
	statusLastBackupEmpty: 'Last backup: —',
	statusLastBackupTime: 'Last backup: {time}',

	// Save Version Modal
	modalSaveTitle: 'Save Version',
	modalNotePrefix: 'Note: ',
	modalVersionName: 'Version name',
	modalVersionNameDescSeq:
		'If left blank, "{label}" will be assigned automatically.',
	modalVersionNameDescDate:
		'If left blank, a date and time label ("{label}") will be assigned.',
	modalFileNamingName: 'Auto-naming for this file',
	modalFileNamingDesc:
		'Format used when the version name is left blank and for quick saves.',
	modalDescName: 'Description',
	modalDescDesc: 'Optionally describe what changed in this version.',
	modalDescPlaceholder: 'e.g. Reorganized the introduction',
	btnCancel: 'Cancel',
	btnSave: 'Save',

	// Restore Confirm Modal
	modalRestoreTitle: 'Restore',
	modalRestorePrefix: 'Are you sure you want to restore "{name}" to ',
	modalRestoreSuffix: ' ({date})?',
	modalRestoreSafetyNote:
		'For your safety, the current content will be silently backed up first.',
	btnRestore: 'Restore',

	// Delete History Modal
	modalDeleteHistoryTitle: 'Delete Version History?',
	modalDeleteHistorySuffix:
		' was deleted. Permanently delete its {count} saved version(s) as well?',
	btnKeepHistory: 'Keep History',
	btnDeleteHistory: 'Delete History',

	// Timeline View
	timelineDisplayText: 'Version History',
	timelineEmptyOpenNote: 'Open a note to view its version history.',
	timelineEmptyNoVersions: 'No saved versions for this note yet.',
	timelineNoActiveNote: 'No active note',
	btnQuickSave: 'Quick Save',
	btnCompareTwo: 'Compare 2 Versions',
	btnCancelSelection: 'Cancel Selection',
	labelCurrentVersion: 'Current Version',
	labelSelectedCount: 'Selected: {count}/2',
	btnCompareSelected: 'Compare Selected',
	autoBackupGroupShow: '{count} auto-backups — click to view',
	autoBackupGroupHide: '{count} auto-backups — click to hide',
	autoBackupCardTitle: 'Auto-backup • {label}',
	btnCompare: 'Compare',
	btnExport: 'Export',
	noticeVersionReadError: "Could not read the selected version's content.",
	noticeRestoredTo: 'Note restored to "{label}".',
	noticeExported: 'Version exported: {fileName}',
	noticeExportError: 'An error occurred while exporting the version.',

	// Diff View
	diffTabTitle: '{basename} — Compare',
	diffDisplayText: 'Version Comparison',
	diffEmptySelect: 'Select a version from the right sidebar to compare.',
	diffEmptyMissingFile: 'The compared file no longer exists in the vault.',
	diffEmptyReadError: 'Could not read one of the selected versions.',
	diffUnknownVersion: 'Unknown Version',
	diffHeaderTitle:
		'{fileName} — Comparing "{leftLabel}" with "{rightLabel}"',
	diffStatChanged: '{count} changed',
	diffStatRemoved: '{count} removed',
	diffStatAdded: '{count} added',
	diffLayoutSplit: 'Side-by-Side',
	diffLayoutUnified: 'Single Column',
	diffShowUnchanged: 'Show unchanged sections ({count})',
	diffLeftSelectorLabel: 'Left (New / Current):',
	diffRightSelectorLabel: 'Right (Old / Compared):',
	diffSwapLabel: 'Swap',
	diffNoDifferences: 'No differences between the two selected versions.',
	btnCopySnippet: 'Copy Snippet',
	tooltipCopySnippet:
		'Copy this section from "{label}" (right column) to clipboard',
	btnApplySnippet: 'Apply to Current File',
	tooltipApplySnippet:
		'Apply this section from "{label}" (right column) to the current file',
	diffSectionAbsentRight:
		'This section does not exist in the compared version',
	diffSectionAbsentLeft: 'This section does not exist in the left-hand text',
	diffStatusChanged: 'Changed',
	diffStatusRemoved: 'Removed',
	diffStatusAdded: 'Added',
	diffStatusUnchanged: 'Unchanged',
	noticeCopiedSnippet: 'Section content from "{label}" copied to clipboard.',
	noticeCopyError: 'Could not copy section.',
	noticeAppliedSnippet:
		'Section "{title}" from "{label}" applied to current file.',
	noticeApplyError:
		'An error occurred while applying the section to the current file.',

	// Markdown sections
	introSectionTitle: 'Introduction / Untitled Section',

	// File Explorer Badges
	badgeManualCount: '{count} manual version(s)',
	badgeAutoCount: '{count} auto-backup(s)',
};
