const MISSING_SERVER_MESSAGE = "当前 worktree 缺少 .env.local 或 Supabase 环境变量未加载。";
const MISSING_BROWSER_MESSAGE = "当前 worktree 缺少 .env.local 或浏览器端 Supabase 环境变量未加载。";

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

export function hasSupabasePublicEnv() {
  return getSupabasePublicEnv().isConfigured;
}

export function getSupabaseServerConfig() {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(MISSING_SERVER_MESSAGE);
  }

  return { url, anonKey };
}

export function getSupabaseBrowserConfig() {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(MISSING_BROWSER_MESSAGE);
  }

  return { url, anonKey };
}

export const SUPABASE_CONFIG_ERROR = MISSING_SERVER_MESSAGE;
export const SUPABASE_BROWSER_CONFIG_ERROR = MISSING_BROWSER_MESSAGE;
