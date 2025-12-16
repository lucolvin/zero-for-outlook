import { build } from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const chromeRoot = resolve(root, "zero-for-outlook-chrome");

async function main() {
  /** @type {import("esbuild").BuildOptions} */
  const common = {
    bundle: true,
    minify: false,
    sourcemap: false,
    platform: "browser",
    target: ["chrome100", "firefox100"],
    format: "iife"
  };

  await build({
    ...common,
    entryPoints: [resolve(chromeRoot, "src/background/index.js")],
    outfile: resolve(chromeRoot, "background.js")
  });

  await build({
    ...common,
    entryPoints: [resolve(chromeRoot, "src/content/index.js")],
    outfile: resolve(chromeRoot, "contentScript.js")
  });

  await build({
    ...common,
    entryPoints: [resolve(chromeRoot, "src/options/index.js")],
    outfile: resolve(chromeRoot, "options.js")
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


