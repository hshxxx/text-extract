import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listEligibleMarketingCopySources } from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const items = await listEligibleMarketingCopySources(supabase, user.id, 50);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取可用素材失败。", 500);
  }
}
