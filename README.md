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

- **Vim-style navigation (j / k)**
  - When enabled, lets you move up and down the message list with **j** (down) and **k** (up), similar to Vim and many email clients.
  - Only works when focus is on the message list and you are _not_ typing in an input, textarea, or rich-text editor, so it will not interfere with composing emails.
  - Default is **on**, but you can toggle it from the extension’s options page (see **Vim-style navigation** toggle).

- **Settings / options page**
  - Lets you capture a keyboard shortcut by pressing the keys directly.
  - Shows brief information on how the extension behaves and on which domains it runs.

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



