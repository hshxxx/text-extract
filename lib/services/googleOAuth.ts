import type { SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { decryptSecret, encryptSecret } from "@/utils/encryption";
import type { GoogleOAuthAccountRecord } from "@/lib/types/domain";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google/auth/callback` : "");

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("缺少 Google OAuth 环境变量配置。");
  }

  return { clientId, clientSecret, redirectUri };
}

function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function getStoredGoogleAccount(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("google_oauth_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取 Google 授权状态失败：${error.message}`);
  }

  return (data ?? null) as GoogleOAuthAccountRecord | null;
}

async function persistGoogleTokens(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    googleEmail: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: number | null;
  },
) {
  const { error } = await supabase.from("google_oauth_accounts").upsert(
    {
      user_id: userId,
      google_email: payload.googleEmail,
      access_token_encrypted: encryptSecret(payload.accessToken),
      refresh_token_encrypted: encryptSecret(payload.refreshToken),
      expiry_date: payload.expiryDate ? new Date(payload.expiryDate).toISOString() : null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`保存 Google 授权信息失败：${error.message}`);
  }
}

async function loadGoogleEmail(client: OAuth2Client) {
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const response = await oauth2.userinfo.get();
  const email = response.data.email?.trim();

  if (!email) {
    throw new Error("无法获取 Google 账号邮箱。");
  }

  return email;
}

export function createGoogleAuthUrl() {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });
}

export async function connectGoogleAccount(
  supabase: SupabaseClient,
  userId: string,
  code: string,
) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google OAuth 未返回完整 token。请重新授权。");
  }

  client.setCredentials(tokens);
  const googleEmail = await loadGoogleEmail(client);

  await persistGoogleTokens(supabase, userId, {
    googleEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? null,
  });

  return { googleEmail };
}

export async function getGoogleAuthStatus(supabase: SupabaseClient, userId: string) {
  const account = await getStoredGoogleAccount(supabase, userId);
  return {
    connected: Boolean(account),
    googleEmail: account?.google_email ?? null,
  };
}

export async function disconnectGoogleAccount(supabase: SupabaseClient, userId: string) {
  const account = await getStoredGoogleAccount(supabase, userId);

  if (!account) {
    return;
  }

  try {
    const client = createGoogleOAuthClient();
    client.setCredentials({
      access_token: decryptSecret(account.access_token_encrypted),
      refresh_token: decryptSecret(account.refresh_token_encrypted),
    });
    await client.revokeCredentials();
  } catch {
    // Best effort revoke only.
  }

  const { error } = await supabase.from("google_oauth_accounts").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`断开 Google 授权失败：${error.message}`);
  }
}

export async function getAuthorizedGoogleClients(supabase: SupabaseClient, userId: string) {
  const account = await getStoredGoogleAccount(supabase, userId);

  if (!account) {
    throw new Error("请先连接 Google 账号。");
  }

  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: decryptSecret(account.access_token_encrypted),
    refresh_token: decryptSecret(account.refresh_token_encrypted),
    expiry_date: account.expiry_date ? new Date(account.expiry_date).getTime() : undefined,
  });

  await client.getAccessToken();
  const credentials = client.credentials;

  const accessToken = credentials.access_token || decryptSecret(account.access_token_encrypted);
  const refreshToken = credentials.refresh_token || decryptSecret(account.refresh_token_encrypted);

  if (
    accessToken !== decryptSecret(account.access_token_encrypted) ||
    refreshToken !== decryptSecret(account.refresh_token_encrypted) ||
    (credentials.expiry_date ?? null) !==
      (account.expiry_date ? new Date(account.expiry_date).getTime() : null)
  ) {
    await persistGoogleTokens(supabase, userId, {
      googleEmail: account.google_email,
      accessToken,
      refreshToken,
      expiryDate: credentials.expiry_date ?? null,
    });
  }

  return {
    auth: client,
    sheets: google.sheets({ version: "v4", auth: client }),
    drive: google.drive({ version: "v3", auth: client }),
    googleEmail: account.google_email,
  };
}
