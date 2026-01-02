## Zero for Outlook (Firefox & Chrome Extension)

This extension adds configurable keyboard shortcuts to Outlook on the web.  
The first shortcut supported is **Undo archive**, which clicks the transient **Undo** button that appears after you archive or move a message.
> [!CAUTION]
> These extensions are still in early beta and are under active development. Expect breaking changes. Use at your own risk and so on.


> [!TIP]
> Find a bug? Open an [issue](https://github.com/lucolvin/zero-for-outlook/issues/new/choose).

> [!NOTE]
> The docs including this README are extremely out of date. A docs site is currently being created. And will be updated [here](https://docs.zero-extension.com/)
.

### What it does

- **Undo archive shortcut**
  - Listens for your chosen key combination (for example **Ctrl + Z** or **Alt + U**).
  - When pressed on an Outlook web tab (and you are _not_ typing in an input/textarea/editor), it finds the **Undo** button and clicks it for you.
  - It is scoped to Outlook web only:
    - `https://outlook.live.com/*`
    - `https://outlook.office.com/*`
    - `https://outlook.office365.com/*`

- **Vim-style navigation (h / j / k / l)**
  - When enabled, gives you a Vim-like flow for switching folders and messages:
    - **`h`** (or `l` from the message list) focuses and "pins" the left sidebar/folder list.
    - While pinned, **`j`** / **`k`** move up and down items in the sidebar.
    - Press **`l`** from the sidebar to move into the message list; then **`j`** / **`k`** move between messages.
    - In the message list, **Shift + `j`** / **Shift + `k`** act like **Shift + ↓ / Shift + ↑**, extending the current selection so you can select **multiple messages at once** and then snooze or archive them using Outlook’s own commands and commands from Zero for Outlook.
  - All vim keys are ignored while you are typing in an input, textarea, or rich-text editor, so they do not interfere with composing emails.
  - Default is **on**, but you can toggle it from the extension's options page (see **Vim-style navigation** toggle).

- **Snooze overlay (s)**
  - Press **`s`** when a message is selected to open a beautiful overlay menu for snoozing or unsnoozing.
  - In regular views, the overlay shows options to snooze: **Later today**, **Tomorrow**, **This weekend**, **Next week**, and **Choose a date**.
  - In the Scheduled folder, the overlay shows an **Unsnooze** option to move messages back to the Inbox.
  - Navigate with **`j`** / **`k`**, select with **Enter**, and close with **Esc** or **`s`**.
  - The overlay displays concrete times (e.g., "5:00 AM", "Wed 8:00 AM") when Outlook provides them.

- **Settings / options page**
  - Lets you capture a keyboard shortcut by pressing the keys directly.
  - Lets you toggle vim-style navigation on/off, including **Shift + j / Shift + k multi-select** behavior in the message list.
  - Lets you enable a dark, glassy theme for the options page and snooze/unsnooze overlay.
  - Shows brief information on how the extension behaves, on which domains it runs, and how vim-style navigation and multi-select work.
  - Accessible by clicking the extension icon in your browser's toolbar, or by right-clicking the extension icon and selecting "Options".

### Privacy / data collection

- The extension **never collects or sends any email content or browsing data**.
- There is **no analytics or telemetry** and no external network requests from the extension code.
- The only data stored is your chosen shortcut and whether vim navigation and dark mode are enabled, kept in the browser’s extension storage and used locally to handle key presses.

### Files overview

- **`zero-for-outlook-chrome/manifest.json`**: Manifest V3 configuration for the Chrome extension.
- **`zero-for-outlook-firefox/manifest.json`**: Manifest V2 configuration for the Firefox extension (with `browser_specific_settings` for Gecko).
- **`contentScript.js`**: Injected into Outlook web; listens for the configured shortcut and clicks the **Undo** button, handles vim-style navigation, and manages the snooze overlay.
- **`options.html` / `options.js` / `options.css`**: Options page UI and logic; stores the shortcut, vim toggle, and dark mode toggle in `storage.sync`.

The same code structure is duplicated for both the Chrome and Firefox versions of the extension, under `zero-for-outlook-chrome` and `zero-for-outlook-firefox`.

### Loading in Chrome (Developer Mode)

1. Run Chrome and open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `zero-for-outlook-chrome` folder:
   - `/path/to/folder/zero-for-outlook/zero-for-outlook-chrome`
4. Open Outlook on the web in a tab, archive an email, and when the **Undo** bar appears, press your configured shortcut to test.
5. Try pressing **`s`** on a selected message to test the snooze overlay, or use **`j`** / **`k`** to navigate messages if vim navigation is enabled.

### Loading in Firefox (Temporary Add-on)

1. Run Firefox and open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file in the Firefox folder:
   - `/path/to/folder/zero-for-outlook/zero-for-outlook-firefox/manifest.json`
4. Open Outlook on the web and test the shortcut the same way as in Chrome.
5. Try pressing **`s`** on a selected message to test the snooze overlay, or use **`j`** / **`k`** to navigate messages if vim navigation is enabled.

### Customizing / extending

- To add more shortcuts (for other actions in Outlook web), you can:
  - Extend the storage schema (e.g., `archiveShortcut`, `markReadShortcut`, etc.).
  - Add more keyboard handlers and DOM queries in `contentScript.js` for the relevant buttons/elements.
  - Expand the options UI to configure those additional shortcuts and toggles.

### Automated versioning

This repository uses GitHub Actions to automatically manage version tags.

**How it works:**

- **Triggers on Push**: Runs every time you push code to `main`.
- **Calculates Version**: It looks at your previous tags. If the last tag was `v1.0.0`, it automatically bumps it to `v1.0.1` (a "patch" update).
- **Tags & Pushes**: It creates the new tag in the repo automatically.

You can force a larger version jump by including specific words in your commit message:

- `#major` (jumps from v1.0.0 to v2.0.0)
- `#minor` (jumps from v1.0.0 to v1.1.0)

---

# ToDo

[Current ToDo List](https://docmost.lukeslabs.xyz/share/19xhhfhgcp/p/to-do-lzhwFvot9q)

---

Copyright (C) 2026 Luke Colvin
