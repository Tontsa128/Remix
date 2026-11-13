import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

process.env.NODE_ENV = "production";
process.env.HOST ??= "0.0.0.0";
process.env.PORT ??= "3000";

const serverEntry = resolve(process.cwd(), "dist/server/index.mjs");
if (!existsSync(serverEntry)) {
  throw new Error(
    `Missing built server entry at ${serverEntry}. Run "npm run build" first.`,
  );
}

await import(pathToFileURL(serverEntry).href);
