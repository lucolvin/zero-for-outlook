# Zero for Outlook (Firefox & Chrome Extension)

Zero for Outlook adds configurable keyboard shortcuts and extends functionality of Outlook on the web, making it more efficient and enjoyable to use.

> [!CAUTION]
> These extensions are still in early beta and are under active development. Expect breaking changes. Use at your own risk and so on.

> [!TIP]
> Find a bug? Open an [issue](https://github.com/lucolvin/zero-for-outlook/issues/new/choose).

> [!NOTE]
> The docs including this README are extremely out of date. A docs site is currently being created. And will be updated at [the docs site](https://docs.zero-extension.com/)

## What it does

Zero for Outlook provides a comprehensive set of keyboard shortcuts and features to enhance your Outlook web experience:

### Core Shortcuts

- **Undo archive shortcut** (default: `Z`)
  - Triggers Outlook's built-in **Undo** after archiving or moving a message
  - Configurable via the options page
  - Only active when you're not typing in an input/textarea/editor

- **Command bar** (default: `Cmd/Ctrl + K`)
  - Superhuman-style command palette for quick access to all features
  - Search and execute commands with keyboard navigation
  - Press `Esc` or click outside to close

### Vim-Style Navigation

When enabled, provides Vim-like navigation for folders and messages:

- **`h`** (or `l` from the message list) focuses and "pins" the left sidebar/folder list
- While pinned, **`j`** / **`k`** move up and down items in the sidebar
- Press **`l`** from the sidebar to move into the message list; then **`j`** / **`k`** move between messages
- In the message list, **Shift + `j`** / **Shift + `k`** act like **Shift + ↓ / Shift + ↑**, extending the current selection so you can select multiple messages at once
- All vim keys are ignored while typing in inputs, textareas, or rich-text editors
- Default is **on**, can be toggled from the options page

### Snooze Overlay

- Press **`s`** when a message is selected to open a beautiful overlay menu for snoozing or unsnoozing
- In regular views, shows options to snooze: **Later today**, **Tomorrow**, **This weekend**, **Next week**, and **Choose a date**
- In the Scheduled folder, shows an **Unsnooze** option to move messages back to the Inbox
- Navigate with **`j`** / **`k`**, select with **Enter**, and close with **Esc** or **`s`**
- Displays concrete times (e.g., "5:00 AM", "Wed 8:00 AM") when Outlook provides them

### Command Bar Actions

The command bar (`Cmd/Ctrl + K`) provides quick access to:

- **Message Actions**
  - Undo last action
  - Summarize current email (requires Gemini API key)
  - Unsubscribe (finds and clicks unsubscribe links)
  - Snooze presets (Later today, Tomorrow, This weekend, Next week)
  - Unsnooze

- **Navigation**
  - Focus sidebar
  - Focus message list
  - Open Calendar
  - Open Inbox/Mail
  - Open Bookings
  - Open To Do
  - Open Outlook settings

- **Extension Settings**
  - Toggle dark mode
  - Toggle celebration (inbox zero overlay)
  - Hide/show Outlook options bar
  - Open Zero for Outlook options page
  - Add custom shortcut (element picker)

- **Custom Shortcuts**
  - All your custom shortcuts appear in the command bar
  - Can be executed directly from the command bar

### AI Features (Optional)

- **Email Summarization** (requires Gemini API key)
  - Uses Google's Gemini API to summarize email conversations
  - Focuses on key decisions, requests, dates, and next steps
  - Accessible via command bar or shortcut

- **AI Title Editing** (requires Gemini API key)
  - When creating custom shortcuts, optionally use AI to generate better names and descriptions
  - Helps format keyboard shortcut names for UI elements
  - Can be toggled on/off in options

### Custom Shortcuts

- Create keyboard shortcuts for any button or element on screen
- Use the element picker (accessible from command bar) to select elements
- Optionally use AI to generate better names and descriptions
- All custom shortcuts appear in the command bar
- Manage all custom shortcuts from the options page

### Additional Features

- **Dark Mode**: Glassy, dark theme for overlays and options page
- **Inbox Zero Celebration**: Optional fireworks/celebration overlay when your inbox reaches zero
- **Options Bar Toggle**: Hide/show Outlook's options bar and header for a cleaner interface
- **Multi-select Support**: Use Shift+j/k in vim mode to select multiple messages

### Privacy / Data Collection

- The extension **never collects or sends any email content or browsing data**
- There is **no analytics or telemetry** and no external network requests from the extension code (except when using optional AI features)
- **AI Features**: When using Gemini API features (email summarization or AI title editing), your content is sent to Google's Gemini API. This requires you to provide your own API key, which is stored locally in your browser's extension storage
- The only data stored locally is:
  - Your chosen shortcuts (undo, command bar)
  - Feature toggles (vim navigation, dark mode, inbox zero, options bar, AI title editing)
  - Custom shortcuts configuration
  - Gemini API key (if provided, stored locally only)

### Supported Domains

The extension is scoped to Outlook web only:

- `https://outlook.live.com/*`
- `https://outlook.office.com/*`
- `https://outlook.office365.com/*`

### Installation

#### Loading in Chrome (Developer Mode)

1. Clone or download this repository
2. Run `bun install` to install dependencies
3. Run `bun run build` to build the extension
4. Open Chrome and navigate to `chrome://extensions`
5. Enable **Developer mode** (top-right toggle)
6. Click **Load unpacked** and select the `dist/chrome` folder
7. Open Outlook on the web in a tab and start using the shortcuts

#### Loading in Firefox (Temporary Add-on)

1. Clone or download this repository
2. Run `bun install` to install dependencies
3. Run `bun run build` to build the extension
4. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
5. Click **Load Temporary Add-on…**
6. Select the `manifest.json` file in the `dist/firefox` folder
7. Open Outlook on the web and start using the shortcuts

#### Building for Distribution

Run `bun run package` to create distribution-ready zip files:

- `dist/zero-for-outlook-chrome.zip`
- `dist/zero-for-outlook-firefox.zip`

### Project Structure

```text
zero-for-outlook/
├── src/
│   ├── background/
│   │   └── index.js          # Background script (handles API calls, options page opening)
│   ├── contentScript/
│   │   ├── core/             # Core functionality
│   │   │   ├── browserApi.js
│   │   │   ├── dom.js
│   │   │   ├── initialization.js
│   │   │   ├── keyboardHandler.js
│   │   │   ├── messageList.js
│   │   │   ├── settings.js
│   │   │   └── shortcuts.js
│   │   ├── features/         # Feature modules
│   │   │   ├── commandBar.js      # Command bar overlay
│   │   │   ├── darkMode.js        # Dark theme management
│   │   │   ├── elementPicker.js   # Custom shortcut element picker
│   │   │   ├── inboxZero.js       # Inbox zero celebration
│   │   │   ├── navigation.js      # Navigation helpers
│   │   │   ├── optionsBar.js      # Outlook options bar toggle
│   │   │   ├── snooze.js          # Snooze overlay
│   │   │   ├── summary.js         # Email summarization overlay
│   │   │   ├── undo.js            # Undo archive
│   │   │   └── vimMode.js         # Vim-style navigation
│   │   ├── styles/           # CSS for overlays
│   │   │   ├── commandBar.css
│   │   │   ├── elementPicker.css
│   │   │   ├── llmEditing.css
│   │   │   └── summary.css
│   │   └── index.js          # Content script entry point
│   ├── options/              # Options page
│   │   ├── index.html
│   │   ├── main.js
│   │   └── style.css
│   ├── assets/
│   │   └── icons/            # Extension icons
│   └── manifest.json         # Base manifest (transformed for Chrome/Firefox)
├── scripts/
│   ├── build.js              # Build script (transforms manifest, copies files)
│   └── package.js            # Packaging script (creates zip files)
├── dist/                     # Build output
│   ├── chrome/               # Chrome extension (Manifest V3)
│   ├── firefox/              # Firefox extension (Manifest V2)
│   └── *.zip                 # Distribution packages
├── vite.config.mts           # Vite configuration
└── package.json
```

### Development

- **Build**: `bun run build` - Builds the content script with Vite and copies files to `dist/chrome/` and `dist/firefox/`
- **Package**: `bun run package` - Builds and creates zip files for distribution

The project uses:

- **Vite** for building the content script (bundles ES modules into a single IIFE)
- **Manifest V3** for Chrome
- **Manifest V2** for Firefox (required for Firefox compatibility)
- **Modular architecture** with feature-based modules

### Customizing / Extending

To add more shortcuts or features:

1. **Add a new feature module** in `src/contentScript/features/`
2. **Register it in `initialization.js`** to load and wire it up
3. **Add commands to the command bar** in `commandBar.js` if applicable
4. **Add options UI** in `src/options/` if configuration is needed
5. **Update settings** in `src/contentScript/core/settings.js` if new settings are needed

### Automated Versioning

This repository uses GitHub Actions to automatically manage version tags.

**How it works:**

- **Triggers on Push**: Runs every time you push code to `main`
- **Calculates Version**: It looks at your previous tags. If the last tag was `v1.0.0`, it automatically bumps it to `v1.0.1` (a "patch" update)
- **Tags & Pushes**: It creates the new tag in the repo automatically

You can force a larger version jump by including specific words in your commit message:

- `#major` (jumps from v1.0.0 to v2.0.0)
- `#minor` (jumps from v1.0.0 to v1.1.0)

---

## ToDo

[Current ToDo List](https://docmost.lukeslabs.xyz/share/19xhhfhgcp/p/to-do-lzhwFvot9q)

---

Copyright (C) 2026 Luke Colvin
