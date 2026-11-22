import { App, TAbstractFile, TFile } from 'obsidian';
import { VersionStore } from '../storage/version-store';
import { TrackingMode } from '../types';
import { formatTimeShort } from '../utils/date';
import { computeContentHash } from '../utils/hash';

const RESTORE_SUPPRESS_TTL_MS = 3500;

export class AutoBackupManager {
	private readonly app: App;
	private readonly store: VersionStore;
	private readonly statusEl: HTMLElement;
	private readonly onBackupSaved?: () => void;

	private enabled: boolean;
	private intervalMs: number;
	private trackingMode: TrackingMode;
	private trackedFiles: Set<string>;
	private timers: Map<string, number> = new Map();
	private suppressedUntil: Map<string, number> = new Map();
	private restoredHashes: Map<string, string> = new Map();
	private runningFiles: Set<string> = new Set();

	constructor(
		app: App,
		store: VersionStore,
		statusEl: HTMLElement,
		enabled: boolean,
		intervalMinutes: number,
		trackingMode: TrackingMode,
		trackedFiles: string[],
		onBackupSaved?: () => void,
	) {
		this.app = app;
		this.store = store;
		this.statusEl = statusEl;
		this.onBackupSaved = onBackupSaved;
		this.enabled = enabled;
		this.intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
		this.trackingMode = trackingMode;
		this.trackedFiles = new Set(trackedFiles);
		this.statusEl.addClass('mg-status-bar');
		this.renderInitialStatus();
	}

	/**
	 * Updates runtime configuration when plugin settings change.
	 */
	configure(
		enabled: boolean,
		intervalMinutes: number,
		trackingMode: TrackingMode,
		trackedFiles: string[],
	): void {
		this.enabled = enabled;
		this.intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
		this.trackingMode = trackingMode;
		this.trackedFiles = new Set(trackedFiles);

		if (!this.enabled) {
			this.clearAllTimers();
			this.statusEl.setText('Oto-yedek kapalı');
			return;
		}

		this.renderInitialStatus();
	}

	/**
	 * Cancels any pending auto-backup timer and clears transient state for a file.
	 */
	cancelForFile(filePath: string): void {
		this.clearTimerForFile(filePath);
		this.suppressedUntil.delete(filePath);
		this.restoredHashes.delete(filePath);
	}

	/**
	 * Cancels any pending auto-backup timer for the file and ignores modify events
	 * for at least 3 seconds after a programmatic restore.
	 */
	suppressAfterRestore(filePath: string, restoredContentHash?: string): void {
		this.clearTimerForFile(filePath);
		this.suppressedUntil.set(
			filePath,
			Date.now() + RESTORE_SUPPRESS_TTL_MS,
		);
		if (restoredContentHash) {
			this.restoredHashes.set(filePath, restoredContentHash);
		}
	}

	/**
	 * Marks a modified Markdown file as pending automatic backup using a single debounce timer.
	 */
	markDirty(file: TAbstractFile): void {
		if (!this.enabled || !(file instanceof TFile)) {
			return;
		}
		if (file.extension.toLowerCase() !== 'md') {
			return;
		}

		const suppressExpiry = this.suppressedUntil.get(file.path);
		if (suppressExpiry !== undefined) {
			if (Date.now() <= suppressExpiry) {
				return;
			}
			this.suppressedUntil.delete(file.path);
		}

		if (!this.isFileTracked(file.path)) {
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.path !== file.path) {
			return;
		}

		this.scheduleDebounceForFile(file.path);
	}

	/**
	 * Updates the status bar timestamp after a manual or automatic save.
	 */
	recordBackupTime(date: Date): void {
		if (!this.enabled) {
			this.statusEl.setText('Oto-yedek kapalı');
			return;
		}
		this.statusEl.setText(`Son yedek: ${formatTimeShort(date)}`);
	}

	/**
	 * Clears all pending timers and state on plugin unload.
	 */
	destroy(): void {
		this.clearAllTimers();
		this.suppressedUntil.clear();
		this.restoredHashes.clear();
		this.runningFiles.clear();
	}

	private isFileTracked(filePath: string): boolean {
		if (this.trackingMode === 'all') {
			return true;
		}
		return this.trackedFiles.has(filePath);
	}

	private renderInitialStatus(): void {
		if (!this.enabled) {
			this.statusEl.setText('Oto-yedek kapalı');
			return;
		}
		this.statusEl.setText('Son yedek: —');
	}

	private scheduleDebounceForFile(filePath: string): void {
		this.clearTimerForFile(filePath);
		const timerId = window.setTimeout(() => {
			this.timers.delete(filePath);
			void this.runBackupForFile(filePath);
		}, this.intervalMs);
		this.timers.set(filePath, timerId);
	}

	private clearTimerForFile(filePath: string): void {
		const existing = this.timers.get(filePath);
		if (existing !== undefined) {
			window.clearTimeout(existing);
			this.timers.delete(filePath);
		}
	}

	private clearAllTimers(): void {
		for (const timerId of this.timers.values()) {
			window.clearTimeout(timerId);
		}
		this.timers.clear();
	}

	private async runBackupForFile(filePath: string): Promise<void> {
		if (!this.enabled || this.runningFiles.has(filePath)) {
			return;
		}
		if (!this.isFileTracked(filePath)) {
			return;
		}

		const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
		if (!(abstractFile instanceof TFile)) {
			return;
		}

		this.runningFiles.add(filePath);
		try {
			const restoredHash = this.restoredHashes.get(filePath);
			if (restoredHash) {
				const currentContent = await this.app.vault.read(abstractFile);
				const currentHash = await computeContentHash(currentContent);
				if (currentHash === restoredHash) {
					return;
				}
				this.restoredHashes.delete(filePath);
			}

			const result = await this.store.saveVersion(abstractFile, {
				kind: 'auto',
			});
			if (result.saved) {
				this.recordBackupTime(new Date());
				this.onBackupSaved?.();
			}
		} catch (error) {
			console.error('Metin Giti otomatik yedekleme hatası:', error);
		} finally {
			this.runningFiles.delete(filePath);
		}
	}
}
