**English** | [Türkçe](README.tr.md)

# Metin Giti

**Metin Giti** is a human-friendly, linear version history plugin for individual Markdown (`.md`) notes in Obsidian—designed without technical Git concepts like `commit`, `branch`, or `merge`.

## Key Features

- **Quick & Manual Version Saving**
  - Save versions with a single click via **Quick Save** (from the ribbon or command palette) or add a custom label and description using **Save Version**.
  - Per-file auto-naming preference: sequential numbering (`v1, v2, v3...`) or date and time (`DD.MM.YYYY HH:mm`).

- **Smart Auto-Backup & Move-Resilient Path Tracking**
  - Silent background auto-backup with a configurable debounce wait time (in minutes) and status bar indicator.
  - Restore protection prevents unnecessary auto-backups when reverting to an older version.
  - SHA-256 content deduplication skips identical snapshots; up to 30 auto-backups are kept per note while manual versions are never automatically deleted.
  - Track **All files** or **Tracked files only** with built-in vault path autocomplete (`AbstractInputSuggest`), existence validation, green connection status indicators, a non-intrusive **Test** button, and move-resilient `autoBackupTracked` metadata so tracked notes keep their backup coverage even when renamed or moved.

- **Linear Timeline Sidebar (`metin-giti-timeline`)**
  - Displays manual versions in reverse chronological order with labels, timestamps, and descriptions.
  - Collapses consecutive auto-backups into clean expandable groups.
  - Supports **Restore** (takes a silent safety backup if current content is unsaved), **Export** (creates a non-conflicting `.md` copy in the same folder), and single-version **Delete** (with confirmation modal and SHA-256-safe snapshot cleanup).

- **Side-by-Side Section Diff & Snippet Recovery (`metin-giti-diff`)**
  - Splits notes by Markdown headings (`#`–`####`) and compares any two versions—or a version against the **Current Version**—in **Side-by-Side** (default) or **Single Column** layout.
  - Includes word-level highlights (`diffWords`), an unchanged-sections filter, flexible left/right dropdown selectors with a **Swap** button, and 2-version selection directly from the timeline.
  - Recover individual sections with **Copy Snippet** or **Apply to Current File**.

- **File Explorer Badges & Safe Deletion**
  - Live version count badges next to `.md` notes in the left file explorer (click to open the note's timeline) and auto-backup shield icons on covered folders.
  - Prompts with **Keep History** or **Delete History** when a tracked `.md` note is deleted.

- **Bilingual Interface (TR / EN) & Clean Storage**
  - Automatically adapts to Obsidian's language (`moment.locale()`) or can be set manually in **Settings → Metin Giti** (`Auto`, `Türkçe`, `English`).
  - Never modifies your notes' YAML frontmatter. Stores all snapshots and metadata in a hidden `.metin-giti/` folder at the vault root using `app.vault.adapter` (desktop & mobile compatible).

## Installation

### Manual Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` into `<YourVault>/.obsidian/plugins/metin-giti/`.
2. Open **Settings → Community plugins** in Obsidian and enable **Metin Giti**.

### Developer Setup

```bash
npm install
npm run build
```

## Screenshots

<!-- Screenshots will be added here:
![Version Timeline](docs/timeline.png)
![Side-by-Side Diff](docs/diff-split.png)
-->

## License

This plugin is licensed under the [0-BSD](LICENSE) license.
