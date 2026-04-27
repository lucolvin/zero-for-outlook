#!/usr/bin/env node
// Build script to merge manifests and copy files to dist/chrome/ and dist/firefox/

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');
const rootEnvPath = path.join(rootDir, '.env');

function parseSimpleEnv(text) {
  const out = {};
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

let envConfig = {};
if (fs.existsSync(rootEnvPath)) {
  envConfig = parseSimpleEnv(fs.readFileSync(rootEnvPath, 'utf8'));
}

const authSiteUrl = process.env.VITE_AUTH_SITE_URL || envConfig.VITE_AUTH_SITE_URL || 'http://localhost:4173';
const apiBaseUrl = process.env.VITE_API_BASE_URL || envConfig.VITE_API_BASE_URL || 'http://localhost:8787';

// Ensure dist directories exist
[chromeDir, firefoxDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Read base manifest
const baseManifest = JSON.parse(
  fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8')
);

// Chrome manifest (Manifest V3)
const chromeManifest = {
  ...baseManifest,
  manifest_version: 3,
  action: {
    default_title: "Zero for Outlook",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  background: {
    service_worker: "background.js"
  }
};

// Firefox MV2 rejects some Chromium-only API permissions (e.g. "windows").
const firefoxApiPermissions = (baseManifest.permissions || []).filter((p) => p !== 'windows');

// Firefox manifest (Manifest V2)
const firefoxManifest = {
  ...baseManifest,
  manifest_version: 2,
  permissions: [
    ...firefoxApiPermissions,
    ...baseManifest.host_permissions
  ],
  browser_action: {
    default_title: "Zero for Outlook",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  background: {
    scripts: ["background.js"],
    persistent: false
  },
  browser_specific_settings: {
    gecko: {
      id: "zero-for-outlook@zero-extension.com",
      strict_min_version: "140.0",
      data_collection_permissions: {
        required: ["personalCommunications", "websiteContent"],
        optional: []
      }
    }
  }
};

// Remove host_permissions from Firefox manifest (it's in permissions)
delete firefoxManifest.host_permissions;

// Write manifests
fs.writeFileSync(
  path.join(chromeDir, 'manifest.json'),
  JSON.stringify(chromeManifest, null, 2)
);
fs.writeFileSync(
  path.join(firefoxDir, 'manifest.json'),
  JSON.stringify(firefoxManifest, null, 2)
);

// Copy background script with env-injected API/auth URLs
const backgroundSource = fs
  .readFileSync(path.join(srcDir, 'background', 'index.js'), 'utf8')
  .replace(/__OZ_AUTH_SITE_URL__/g, authSiteUrl)
  .replace(/__OZ_API_BASE_URL__/g, apiBaseUrl);
fs.writeFileSync(path.join(chromeDir, 'background.js'), backgroundSource);
fs.writeFileSync(path.join(firefoxDir, 'background.js'), backgroundSource);

// Copy options files
const optionsFiles = ['index.html', 'main.js', 'style.css'];
optionsFiles.forEach(file => {
  const srcFile = path.join(srcDir, 'options', file);
  const destName = file === 'index.html' ? 'options.html' : 
                   file === 'main.js' ? 'main.js' : 'style.css';
  
  fs.copyFileSync(srcFile, path.join(chromeDir, destName));
  fs.copyFileSync(srcFile, path.join(firefoxDir, destName));
});

// Copy icons
const iconsDir = path.join(srcDir, 'assets', 'icons');
const chromeIconsDir = path.join(chromeDir, 'icons');
const firefoxIconsDir = path.join(firefoxDir, 'icons');

[chromeIconsDir, firefoxIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const iconFiles = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png'));
iconFiles.forEach(file => {
  fs.copyFileSync(
    path.join(iconsDir, file),
    path.join(chromeIconsDir, file)
  );
  fs.copyFileSync(
    path.join(iconsDir, file),
    path.join(firefoxIconsDir, file)
  );
});

// Copy content script (built by Vite)
const contentScript = path.join(distDir, 'contentScript.js');
if (fs.existsSync(contentScript)) {
  fs.copyFileSync(contentScript, path.join(chromeDir, 'contentScript.vite.js'));
  fs.copyFileSync(contentScript, path.join(firefoxDir, 'contentScript.vite.js'));
}

console.log('✓ Build complete: dist/chrome/ and dist/firefox/');

