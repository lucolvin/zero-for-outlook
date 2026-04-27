import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(path.resolve(here, "..", ".."), ".env"),
  path.join(path.resolve(here, ".."), ".env"),
  path.join(process.cwd(), ".env")
];
for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
