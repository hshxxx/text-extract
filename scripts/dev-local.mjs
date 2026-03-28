import { spawnSync } from "node:child_process";
import path from "node:path";

function runNodeScript(scriptName) {
  const result = spawnSync(process.execPath, [path.join("scripts", scriptName)], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getNextBinary() {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(process.cwd(), "node_modules", ".bin", `next${suffix}`);
}

runNodeScript("env-link.mjs");
runNodeScript("env-check.mjs");

const nextArgs = ["dev", ...process.argv.slice(2)];
const nextResult = spawnSync(getNextBinary(), nextArgs, {
  stdio: "inherit",
});

process.exit(nextResult.status ?? 1);
