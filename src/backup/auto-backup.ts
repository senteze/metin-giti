import { App, TAbstractFile, TFile } from 'obsidian';
import { VersionStore } from '../storage/version-store';
import { TrackingMode } from '../types';
import { formatTimeShort } from '../utils/date';

export class AutoBackupManager {
	private readonly app: App;
	private readonly store: VersionStore;
	private readonly statusEl: HTMLElement;

	private enabled: boolean;
	private intervalMs: number;
	private trackingMode: TrackingMode;
	private trackedFiles: Set<string>;
	private dirtyFiles: Set<string> = new Set();
	private timerId: number | null = null;
	private isRunning = false;

	constructor(
		app: App,
		store: VersionStore,
		statusEl: HTMLElement,
		enabled: boolean,
		intervalMinutes: number,
		trackingMode: TrackingMode,
		trackedFiles: string[],
	) {
		this.app = app;
		this.store = store;
		this.statusEl = statusEl;
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
			this.clearTimer();
			this.statusEl.setText('Oto-yedek kapalı');
			return;
		}

		this.renderInitialStatus();
		if (this.dirtyFiles.size > 0) {
			this.scheduleTimer();
		}
	}

	/**
	 * Marks a modified Markdown file as pending automatic backup if eligible.
	 */
	markDirty(file: TAbstractFile): void {
		if (!this.enabled || !(file instanceof TFile)) {
			return;
		}
		if (file.extension.toLowerCase() !== 'md') {
			return;
		}
		if (!this.isFileTracked(file.path)) {
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.path !== file.path) {
			return;
		}

		this.dirtyFiles.add(file.path);
		this.scheduleTimer();
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
	 * Clears pending timers and state on plugin unload.
	 */
	destroy(): void {
		this.clearTimer();
		this.dirtyFiles.clear();
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

	private scheduleTimer(): void {
		this.clearTimer();
		this.timerId = window.setTimeout(() => {
			this.timerId = null;
			void this.flushPendingBackups();
		}, this.intervalMs);
	}

	private clearTimer(): void {
		if (this.timerId !== null) {
			window.clearTimeout(this.timerId);
			this.timerId = null;
		}
	}

	private async flushPendingBackups(): Promise<void> {
		if (!this.enabled || this.isRunning || this.dirtyFiles.size === 0) {
			return;
		}

		this.isRunning = true;
		const paths = Array.from(this.dirtyFiles);
		this.dirtyFiles.clear();

		try {
			let anySaved = false;
			for (const filePath of paths) {
				if (!this.isFileTracked(filePath)) {
					continue;
				}
				const abstractFile =
					this.app.vault.getAbstractFileByPath(filePath);
				if (!(abstractFile instanceof TFile)) {
					continue;
				}
				const result = await this.store.saveVersion(abstractFile, {
					kind: 'auto',
				});
				if (result.saved) {
					anySaved = true;
				}
			}

			if (anySaved) {
				this.recordBackupTime(new Date());
			}
		} catch (error) {
			console.error('Metin Giti otomatik yedekleme hatası:', error);
		} finally {
			this.isRunning = false;
			if (this.dirtyFiles.size > 0 && this.enabled) {
				this.scheduleTimer();
			}
		}
	}
}
