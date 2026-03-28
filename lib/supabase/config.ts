const MISSING_SERVER_MESSAGE =
  "本地环境未初始化，请先运行 `npm run env:link` 并确认 `~/.config/ai-prompt-structurer/.env.local` 已配置。";
const MISSING_BROWSER_MESSAGE =
  "本地环境未初始化，请先运行 `npm run env:link`，然后重启 dev server。";

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
