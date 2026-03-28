import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const SHARED_ENV_DIR = path.join(os.homedir(), ".config", "ai-prompt-structurer");
export const SHARED_ENV_FILE = path.join(SHARED_ENV_DIR, ".env.local");
export const LOCAL_ENV_FILE = path.join(process.cwd(), ".env.local");
export const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ENCRYPTION_KEY",
];

export function formatPathForDisplay(filePath) {
  return filePath.replace(os.homedir(), "~");
}

export function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const exportless = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separator = exportless.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = exportless.slice(0, separator).trim();
    const value = exportless.slice(separator + 1).trim();
    if (!key) {
      continue;
    }

    let normalized = value;
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1);
    }

    entries[key] = normalized;
  }

  return entries;
}

export function getMissingRequiredKeys(parsedEnv) {
  return REQUIRED_ENV_KEYS.filter((key) => !parsedEnv[key]);
}

export function printEnvBootstrapHint() {
  const sharedPath = formatPathForDisplay(SHARED_ENV_FILE);
  console.error(`请先把真实环境变量写入 ${sharedPath}。`);
  console.error("可从仓库根目录的 .env.example 复制一份后再填写真实值。");
}
