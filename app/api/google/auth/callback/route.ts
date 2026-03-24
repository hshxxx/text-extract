import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connectGoogleAccount } from "@/lib/services/googleOAuth";

function redirectToExport(baseUrl: string, pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, baseUrl);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToExport(request.url, "/login", { next: "/export-to-sheets" });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error");

  if (authError) {
    return redirectToExport(request.url, "/export-to-sheets", { google_error: authError });
  }

  if (!code) {
    return redirectToExport(request.url, "/export-to-sheets", { google_error: "missing_code" });
  }

  try {
    await connectGoogleAccount(supabase, user.id, code);
    return redirectToExport(request.url, "/export-to-sheets", { google: "connected" });
  } catch (error) {
    return redirectToExport(request.url, "/export-to-sheets", {
      google_error: error instanceof Error ? error.message : "google_auth_failed",
    });
  }
}
