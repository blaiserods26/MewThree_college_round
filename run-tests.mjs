import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const testFiles = readdirSync("packages", { recursive: true })
  .filter((f) => typeof f === "string" && f.endsWith(".test.ts"))
  .map((f) => join("packages", f));

const args = [
  "--import",
  "./test-register.mjs",
  "--import",
  "tsx",
  "--test",
  ...testFiles,
];

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => {
  process.exit(code ?? 0);
});
