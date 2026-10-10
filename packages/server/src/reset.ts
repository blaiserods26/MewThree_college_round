import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(): void {
  if (typeof (process as any).loadEnvFile !== "function") return;
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, ".env"),
  ];
  for (const envFile of candidates) {
    if (fs.existsSync(envFile)) {
      try {
        (process as any).loadEnvFile(envFile);
        break;
      } catch {}
    }
  }
}
loadEnv();

// Standalone reset: `npm run demo:reset` (stop the API server first, or use
// POST /api/admin/reset when the server runs with ENABLE_DEMO_RESET=true).
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "patchwork-db.json");

const store = new JsonFileStore(DB_PATH);
store.reset();
console.log(`PATCHWORK demo data reset to baseline at ${DB_PATH}`);
