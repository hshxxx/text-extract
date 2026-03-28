import fs from "node:fs";
import {
  LOCAL_ENV_FILE,
  SHARED_ENV_FILE,
  formatPathForDisplay,
  getMissingRequiredKeys,
  parseEnvFile,
  printEnvBootstrapHint,
} from "./env-utils.mjs";

function main() {
  if (!fs.existsSync(LOCAL_ENV_FILE)) {
    console.error("当前 worktree 缺少 .env.local。");
    printEnvBootstrapHint();
    process.exit(1);
  }

  if (!fs.existsSync(SHARED_ENV_FILE)) {
    console.error(`缺少共享环境文件：${formatPathForDisplay(SHARED_ENV_FILE)}`);
    printEnvBootstrapHint();
    process.exit(1);
  }

  const parsedEnv = parseEnvFile(LOCAL_ENV_FILE);
  const missingKeys = getMissingRequiredKeys(parsedEnv);

  if (missingKeys.length > 0) {
    console.error(`共享环境文件缺少关键变量：${missingKeys.join(", ")}`);
    console.error(`请编辑 ${formatPathForDisplay(SHARED_ENV_FILE)} 后重试。`);
    process.exit(1);
  }

  console.log(`环境检查通过：${formatPathForDisplay(LOCAL_ENV_FILE)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "检查本地环境变量失败。");
  process.exit(1);
}
