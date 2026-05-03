export default defineContentScript({
  matches: [
    "https://outlook.live.com/*",
    "https://outlook.office.com/*",
    "https://outlook.office365.com/*",
    "https://outlook.cloud.microsoft/*"
  ],
  runAt: "document_idle",
  main() {
    import("../../src/contentScript/index.ts");
  }
});
