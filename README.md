## Zero for Outlook (Firefox & Chrome Extension)

This extension adds configurable keyboard shortcuts to Outlook on the web.  
The first shortcut supported is **Undo archive**, which clicks the transient **Undo** button that appears after you archive or move a message.

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
    - **`h`** (or `l` from the message list) focuses and “pins” the left sidebar/folder list.
    - While pinned, **`j`** / **`k`** move up and down items in the sidebar.
    - Press **`l`** from the sidebar to move into the message list; then **`j`** / **`k`** move between messages.
  - All vim keys are ignored while you are typing in an input, textarea, or rich-text editor, so they do not interfere with composing emails.
  - Default is **on**, but you can toggle it from the extension’s options page (see **Vim-style navigation** toggle).

- **Settings / options page**
  - Lets you capture a keyboard shortcut by pressing the keys directly.
  - Shows brief information on how the extension behaves, on which domains it runs, and how vim-style navigation works.

### Privacy / data collection

- The extension **never collects or sends any email content or browsing data**.
- There is **no analytics or telemetry** and no external network requests from the extension code.
- The only data stored is your chosen shortcut and whether vim navigation is enabled, kept in the browser’s extension storage and used locally to handle key presses.

### Files overview

- **`manifest.json`**: WebExtension manifest (MV3) for Chrome and Firefox.
- **`contentScript.js`**: Injected into Outlook web; listens for the configured shortcut and clicks the **Undo** button.
- **`options.html` / `options.js` / `options.css`**: Options page UI and logic; stores the shortcut in `storage.sync`.

The same code structure is duplicated for both the Chrome and Firefox versions of the extension.

### Loading in Chrome (Developer Mode)

1. Run Chrome and open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `outlook-zero` folder:
   - `/Users/lcolvin/Dev/outlook-zero`
4. Open Outlook on the web in a tab, archive an email, and when the **Undo** bar appears, press your configured shortcut to test.

### Loading in Firefox (Temporary Add-on)

1. Run Firefox and open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file in:
   - `/Users/lcolvin/Dev/outlook-zero/manifest.json`
4. Open Outlook on the web and test the shortcut the same way as in Chrome.

### Customizing / extending

- To add more shortcuts (for other actions in Outlook web), you can:
  - Extend the storage schema (e.g., `archiveShortcut`, `markReadShortcut`, etc.).
  - Add more keyboard handlers and DOM queries in `contentScript.js` for the relevant buttons/elements.
  - Expand the options UI to configure those additional shortcuts.



