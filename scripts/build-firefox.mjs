import { build } from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const firefoxRoot = resolve(root, "zero-for-outlook-firefox");

async function main() {
  /** @type {import("esbuild").BuildOptions} */
  const common = {
    bundle: true,
    minify: false,
    sourcemap: false,
    platform: "browser",
    target: ["firefox100"],
    format: "iife"
  };

  await build({
    ...common,
    entryPoints: [resolve(firefoxRoot, "src/background/index.js")],
    outfile: resolve(firefoxRoot, "background.js")
  });

  await build({
    ...common,
    entryPoints: [resolve(firefoxRoot, "src/content/index.js")],
    outfile: resolve(firefoxRoot, "contentScript.js")
  });

  await build({
    ...common,
    entryPoints: [resolve(firefoxRoot, "src/options/index.js")],
    outfile: resolve(firefoxRoot, "options.js")
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


