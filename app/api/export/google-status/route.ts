import { requireApiUser } from "@/lib/api-auth";
import { getGoogleAuthStatus } from "@/lib/services/googleOAuth";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const status = await getGoogleAuthStatus(supabase, user.id);
    return jsonOk(status);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取 Google 授权状态失败。", 500);
  }
}
