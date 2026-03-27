import type { SessionResponse } from "@/lib/types/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: SessionResponse = {
      authenticated: Boolean(user),
      userEmail: user?.email ?? null,
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取登录状态失败。", 500);
  }
}
