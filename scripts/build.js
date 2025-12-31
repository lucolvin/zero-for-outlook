#!/usr/bin/env node
// Build script to merge manifests and copy files to dist/chrome/ and dist/firefox/

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');

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

// Firefox manifest (Manifest V2)
const firefoxManifest = {
  ...baseManifest,
  manifest_version: 2,
  permissions: [
    ...baseManifest.permissions,
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
      id: "outlook-zero@example.com",
      strict_min_version: "109.0"
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

// Copy background script
fs.copyFileSync(
  path.join(srcDir, 'background', 'index.js'),
  path.join(chromeDir, 'background.js')
);
fs.copyFileSync(
  path.join(srcDir, 'background', 'index.js'),
  path.join(firefoxDir, 'background.js')
);

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

