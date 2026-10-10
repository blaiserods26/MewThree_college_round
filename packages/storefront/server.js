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

const PORT = Number(process.env.STOREFRONT_PORT) || 3000;

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
  let filePath = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);

  // If asking for /patchwork.js, serve stub if not present
  if (urlPath === "/patchwork.js" && !fs.existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end("// PATCHWORK Runtime Stub (injection ready)");
    return;
  }

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
  console.log(`Storefront running at http://localhost:${PORT}`);
});
