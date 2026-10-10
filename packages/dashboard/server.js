import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  if (typeof process.loadEnvFile !== "function") return;
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, ".env"),
  ];
  for (const envFile of candidates) {
    if (fs.existsSync(envFile)) {
      try {
        process.loadEnvFile(envFile);
        break;
      } catch {}
    }
  }
}
loadEnv();

const PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT) || 5173;
const API_BASE = process.env.PATCHWORK_API_BASE || "http://localhost:4000/api";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  // Runtime config for the browser, generated from environment variables.
  if (urlPath === "/config.js") {
    res.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" });
    res.end(
      `window.PATCHWORK_CONFIG = ${JSON.stringify({ apiBase: API_BASE, storefrontUrl: STOREFRONT_URL })};`
    );
    return;
  }

  const filePath = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`PATCHWORK Dashboard running at http://localhost:${PORT}`);
});
