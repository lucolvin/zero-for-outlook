# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.7.2

### Fixed

- Small update to wording in options

## 0.7.1

### Fixed

- Enabled inbox zero celebration by default

## 0.7.0

### Features

- Added toggle to options page and command bar to hide/show email archived popup
- Moved appearance options to their own page
- **Major UI Redesign**:
  - Added modern header bar with page icon, title, and save button
  - Implemented gradient backgrounds with accent color integration
  - Added modern accent color picker with 7 color options
  - Added OLED Mode toggle for true-black backgrounds on OLED displays
  - Added popup opacity slider (70-100%) for command bar and overlays
  - Added backdrop blur toggle to enable/disable blur effect behind overlays
  - Redesigned theme toggle with modern button interface
  - Full-width content layout with better spacing
- Applied accent colors consistently across extension (options page, command bar, summary popup, snooze overlay)
- Enhanced overall styling with more modern, polished UI design

### Fixed

- Improve the unsubscribe logic even more to handle more edge cases
- Inbox zero celebration now only triggers on real inbox `> 0 -> 0` transitions, preventing repeated popups when navigating between folders (for example archive to inbox)

### Changed

- Replaced inbox zero confetti with a fullscreen streak overlay
- Added inbox zero streak tracking with persistent day-to-day counts
- **Improved Save Behavior**:
  - Changes are now batched and only saved when Save button is clicked
  - No status shown when all changes are saved (cleaner UI)
  - Added Reset button that appears with unsaved changes to revert all pending changes
  - Visual feedback for unsaved changes

## 0.6.1

### Feature

- Massively improved unsubscribe logic

## [0.6.0] - 2026-4-19

### Fixed

- Improved custom shortcut creation flow to handle edge cases and provide more info to the user
- Disabled llm editing of custom shortcut titles when no API key is present
- Resolved issue in Firefox affecting max scroll when using vim keybindings

### Features

- Refactored options page for cleaner layout
- Add json import/export option for user settings and shortcuts
- Add option to manually add custom shortcuts for advanced users

## [0.5.12] - 2026-3-13

### Feature

- Added shortcut for showing blocked content on emails

## [0.5.11] - 2026-02-10

### Fixed

- Resolved issue with domain detection logic

## [0.5.10] - 2026-02-10

### Feature

- Added support for additional outlook domains

## [0.5.6] - 2026-01-02

### Fixed

- Tweaked build process and code for Firefox addon submission compliance

## [0.5.1] - 2026-01-02

### Documentation

- Updated extension description

## [0.5.0] - 2025-12-30

### Changed

- Major rewrite: introduced a compiler step for cleaner development
- Removed the monolithic content script

## [0.4.2] - 2025-12-30

### Changed

- Removed Logo.svg

## [0.4.1] - 2025-12-30

### Documentation

- Bumped version

## [0.4.0] - 2025-12-30

### Added

- Added custom shortcuts (managed via options page) that appear in the command bar
- Added optional LLM-based editing for custom shortcut names (with API key, with fallback)

## [0.3.0] - 2025-12-20

### Added

- Added bookings and todo to the command bar
- Added inbox and calendar toggle options to the command bar
- Added logo to the extension

### Changed

- Updated logo styling

### Fixed

- Fixed Firefox Cmd+K conflict with browser hotkey

### Documentation

- Added link to todo list in Docmost
- Added copyright notice to the options page
- Removed unneeded "built for" text from options page
- Fixed formatting issues in LICENSE file
- Updated license to GPL-3.0
- Added copyright notice to README
- Fixed capitalization in issue reporting section
- Updated README with correct link for issues
- Added caution and tip notes to README
- Updated README with warnings and documentation status
