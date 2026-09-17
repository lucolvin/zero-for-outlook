import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parseHTML } from "linkedom";

// Bundle the real command bar, including its CSS imports, without running WXT.
const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL("../src/contentScript/features/commandBar.ts", import.meta.url))],
  bundle: true,
  write: false,
  format: "esm",
  loader: { ".css": "text" }
});
globalThis.chrome = {};
const commands = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

beforeEach(() => {
  const { document, window } = parseHTML("<html><head></head><body></body></html>");
  globalThis.document = document;
  globalThis.window = window;
});

afterEach(() => {
  commands.closeCommandOverlay();
  delete globalThis.document;
  delete globalThis.window;
});

/** Render markup and record direct clicks on its identified elements. */
function trackClicks(markup) {
  document.body.innerHTML = markup;
  const clicks = [];
  for (const element of document.querySelectorAll("[id]")) {
    element.addEventListener("click", (event) => {
      if (event.target === element) clicks.push(element.id);
    });
  }
  return clicks;
}

for (const activation of ["keyboard", "mouse"]) {
  test(`unsubscribe opens the actual link on the first ${activation} command`, () => {
    const clicks = trackClicks(`
      <div id="ConversationReadingPaneContainer">
        <div role="button" id="message" aria-label="Expand message">
          <button id="more">More actions</button>
          <p>Newsletter content</p>
          <p><a id="unsubscribe" href="https://example.com/track/123">Unsubscribe</a></p>
        </div>
      </div>
    `);
    commands.rebuildCommandList();
    commands.openCommandOverlay();
    const input = document.querySelector(".oz-command-input");
    input.value = "unsubscribe";
    input.dispatchEvent(new window.Event("input"));
    assert.equal(document.querySelectorAll(".oz-command-item").length, 1);
    if (activation === "keyboard") {
      assert.equal(commands.handleCommandOverlayKeydown({
        key: "Enter", preventDefault() {}, stopPropagation() {}
      }), true);
    } else {
      document.querySelector(".oz-command-item").click();
    }
    assert.equal(commands.isCommandOverlayOpen(), false);
    assert.deepEqual(clicks, ["unsubscribe"]);
  });
}

test("nearby footer links do not steal the unsubscribe click", () => {
  const clicks = trackClicks(`
    <div id="ConversationReadingPaneContainer">
      <p>
        <a id="website" href="https://example.com">Visit our website</a>
        <a id="unsubscribe" href="https://example.com/track/123">Unsubscribe</a>
        <a id="privacy" href="https://example.com/privacy">Privacy policy</a>
      </p>
    </div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), true);
  assert.deepEqual(clicks, ["unsubscribe"]);
});

test("generic here links still use surrounding unsubscribe instructions", () => {
  const clicks = trackClicks(`
    <div data-app-section="ConversationContainer">
      <p>To stop receiving these emails, click <a id="unsubscribe" href="https://example.com/track/123">here</a>.</p>
    </div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), true);
  assert.deepEqual(clicks, ["unsubscribe"]);
});

test("an explicit unsubscribe link takes priority over a generic contextual link", () => {
  const clicks = trackClicks(`
    <div id="ConversationReadingPaneContainer">
      <p>To unsubscribe, click <a id="here" href="https://example.com/track/123">here</a>.</p>
      <p><a id="unsubscribe" href="https://example.com/track/456">Unsubscribe</a></p>
    </div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), true);
  assert.deepEqual(clicks, ["unsubscribe"]);
});

for (const href of ["https://example.com/unsubscribe", "mailto:unsubscribe@example.com"]) {
  test(`unsubscribe URL remains actionable: ${href}`, () => {
    const clicks = trackClicks(`<div id="ConversationReadingPaneContainer"><a id="unsubscribe" href="${href}">Click here</a></div>`);
    assert.equal(commands.clickUnsubscribeLink(), true);
    assert.deepEqual(clicks, ["unsubscribe"]);
  });
}

test("does not click unrelated controls when unsubscribe is only mentioned in prose", () => {
  const clicks = trackClicks(`
    <div id="ConversationReadingPaneContainer">
      <button id="more">More actions</button>
      <p>Reply to this email to unsubscribe.</p>
    </div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), false);
  assert.deepEqual(clicks, []);
});

test("limits the search to the current reading pane", () => {
  const clicks = trackClicks(`
    <a id="outside" href="https://example.com/unsubscribe">Unsubscribe</a>
    <div id="ConversationReadingPaneContainer"><p>No unsubscribe link here.</p></div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), false);
  assert.deepEqual(clicks, []);
});

test("Outlook unsubscribe buttons can match their accessible label", () => {
  const clicks = trackClicks(`
    <div id="ConversationReadingPaneContainer">
      <button id="more" aria-label="More actions">...</button>
      <button id="unsubscribe" aria-label="Unsubscribe from this sender"><span>Manage</span></button>
    </div>
  `);
  assert.equal(commands.clickUnsubscribeLink(), true);
  assert.deepEqual(clicks, ["unsubscribe"]);
});

test("preference links remain a fallback in layouts without a recognized pane", () => {
  const clicks = trackClicks(`<a id="preferences" href="https://example.com/settings">Email preferences</a>`);
  assert.equal(commands.clickUnsubscribeLink(), true);
  assert.deepEqual(clicks, ["preferences"]);
});
