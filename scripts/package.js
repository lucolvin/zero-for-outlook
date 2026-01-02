#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

function removeMacMetadata(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === "__MACOSX") {
      fs.rmSync(fullPath, { recursive: true, force: true });
      continue;
    }

    if (entry.isDirectory()) {
      removeMacMetadata(fullPath);
      continue;
    }

    if (entry.name === ".DS_Store" || entry.name.startsWith("._")) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // best effort
      }
    }
  }
}

function zipDirectory(sourceDir, zipPath) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing directory: ${sourceDir}`);
  }

  // Best-effort cleanup in case the dir was created by unzipping/copying on macOS.
  removeMacMetadata(sourceDir);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Ensure `zip` exists.
  try {
    execFileSync("zip", ["-v"], { stdio: "ignore" });
  } catch (e) {
    throw new Error(
      "Could not find the `zip` command. Install it (macOS usually has it) or adjust scripts/package.js to use a JS zip library."
    );
  }

  // Zip the directory contents from within the directory so the zip has a flat root.
  // Exclude macOS metadata patterns as an extra safety net.
  const exclude = [
    "__MACOSX/*",
    "__MACOSX/**",
    "*/__MACOSX/*",
    "*/__MACOSX/**",
    ".DS_Store",
    "*/.DS_Store",
    "*/*/.DS_Store",
    "._*",
    "*/._*",
    "*/*/._*"
  ];

  execFileSync("zip", ["-r", zipPath, ".", "-x", ...exclude], {
    cwd: sourceDir,
    stdio: "inherit"
  });
}

function main() {
  const chromeDir = path.join(distDir, "chrome");
  const firefoxDir = path.join(distDir, "firefox");

  const chromeZip = path.join(distDir, "zero-for-outlook-chrome.zip");
  const firefoxZip = path.join(distDir, "zero-for-outlook-firefox.zip");

  zipDirectory(chromeDir, chromeZip);
  zipDirectory(firefoxDir, firefoxZip);

  // eslint-disable-next-line no-console
  console.log("✓ Packaged:");
  // eslint-disable-next-line no-console
  console.log(`  - ${path.relative(rootDir, chromeZip)}`);
  // eslint-disable-next-line no-console
  console.log(`  - ${path.relative(rootDir, firefoxZip)}`);
}

main();
