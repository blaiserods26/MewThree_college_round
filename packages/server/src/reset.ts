import path from "node:path";
import { JsonFileStore } from "./store.js";

// Standalone reset: `npm run demo:reset` (stop the API server first, or use
// POST /api/admin/reset when the server runs with ENABLE_DEMO_RESET=true).
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "patchwork-db.json");

const store = new JsonFileStore(DB_PATH);
store.reset();
console.log(`PATCHWORK demo data reset to baseline at ${DB_PATH}`);
