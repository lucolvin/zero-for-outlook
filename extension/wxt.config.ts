import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "wxt";

const repoRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const outlookMatches = [
  "https://outlook.live.com/*",
  "https://outlook.office.com/*",
  "https://outlook.office365.com/*",
  "https://outlook.cloud.microsoft/*"
];

export default defineConfig({
  outDir: "dist",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    envDir: repoRootDir
  }),
  manifest: {
    name: "Zero for Outlook",
    description:
      "Zero for Outlook adds configurable keyboard shortcuts and extends functionality of Outlook on the web.",
    version: "0.8.1",
    permissions: ["storage", "tabs"],
    host_permissions: [
      ...outlookMatches,
      "https://generativelanguage.googleapis.com/*"
    ],
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    action: {
      default_title: "Zero for Outlook",
      default_icon: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    browser_specific_settings: {
      gecko: {
        id: "outlook-zero@example.com",
        strict_min_version: "140.0",
        data_collection_permissions: {
          required: ["personalCommunications", "websiteContent"],
          optional: []
        }
      }
    }
  }
});
