import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileStore } from "./store.js";
import { PatchService } from "./service.js";
import { createServer } from "./api.js";

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

export * from "./store.js";
export * from "./service.js";
export * from "./api.js";
export * from "./ai.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "patchwork-db.json");

const store = new JsonFileStore(DB_PATH);
const service = new PatchService(store);
const server = createServer(service, {
  enableDemoReset: process.env.ENABLE_DEMO_RESET === "true",
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`PATCHWORK Server running at http://localhost:${PORT}`);
  });
}
