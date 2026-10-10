import path from "node:path";
import { JsonFileStore } from "./store.js";
import { PatchService } from "./service.js";
import { createServer } from "./api.js";

export * from "./store.js";
export * from "./service.js";
export * from "./api.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "patchwork-db.json");

const store = new JsonFileStore(DB_PATH);
const service = new PatchService(store);
const server = createServer(service);

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`PATCHWORK Server running at http://localhost:${PORT}`);
  });
}
