import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createGoogleAuthUrl } from "@/lib/services/googleOAuth";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/export-to-sheets", request.url));
  }

  return NextResponse.redirect(createGoogleAuthUrl());
}
