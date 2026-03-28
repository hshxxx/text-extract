import fs from "node:fs";
import path from "node:path";
import {
  LOCAL_ENV_FILE,
  SHARED_ENV_DIR,
  SHARED_ENV_FILE,
  formatPathForDisplay,
  printEnvBootstrapHint,
} from "./env-utils.mjs";

function ensureSharedEnvExists() {
  if (fs.existsSync(SHARED_ENV_FILE)) {
    return true;
  }

  console.error(`缺少共享环境文件：${formatPathForDisplay(SHARED_ENV_FILE)}`);
  if (!fs.existsSync(SHARED_ENV_DIR)) {
    console.error(`目录不存在：${formatPathForDisplay(SHARED_ENV_DIR)}`);
  }
  printEnvBootstrapHint();
  return false;
}

function removeLocalEnvIfNeeded() {
  if (!fs.existsSync(LOCAL_ENV_FILE)) {
    return;
  }

  const stat = fs.lstatSync(LOCAL_ENV_FILE);
  if (!stat.isSymbolicLink()) {
    throw new Error(
      `当前 worktree 的 .env.local 不是软链接，请先手动备份或删除：${LOCAL_ENV_FILE}`,
    );
  }

  const currentTarget = fs.readlinkSync(LOCAL_ENV_FILE);
  const resolvedTarget = path.resolve(path.dirname(LOCAL_ENV_FILE), currentTarget);
  if (resolvedTarget === SHARED_ENV_FILE) {
    console.log(`已存在共享软链接：${LOCAL_ENV_FILE} -> ${formatPathForDisplay(SHARED_ENV_FILE)}`);
    return "linked";
  }

  fs.unlinkSync(LOCAL_ENV_FILE);
}

function main() {
  if (!ensureSharedEnvExists()) {
    process.exit(1);
  }

  const status = removeLocalEnvIfNeeded();
  if (status === "linked") {
    return;
  }

  fs.symlinkSync(SHARED_ENV_FILE, LOCAL_ENV_FILE);
  console.log(`已创建共享软链接：${LOCAL_ENV_FILE} -> ${formatPathForDisplay(SHARED_ENV_FILE)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "建立 .env.local 软链接失败。");
  process.exit(1);
}
