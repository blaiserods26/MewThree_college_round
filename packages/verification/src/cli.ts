import { runPatchVerificationDirect } from "./worker.js";

async function main() {
  let inputRaw = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    inputRaw += chunk;
  }
  if (!inputRaw.trim()) {
    process.exit(0);
  }
  const options = JSON.parse(inputRaw);
  const result = await runPatchVerificationDirect(options);
  process.stdout.write(JSON.stringify(result));
}

main().catch((err) => {
  console.error("CLI runner error:", err);
  process.exit(1);
});
