import { createSupabaseServerClient } from "@/lib/supabase/server";
import { disconnectGoogleAccount } from "@/lib/services/googleOAuth";
import { jsonError, jsonOk } from "@/utils/http";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    await disconnectGoogleAccount(supabase, user.id);
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "断开 Google 授权失败。", 500);
  }
}
