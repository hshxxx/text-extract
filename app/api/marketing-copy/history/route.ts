import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMarketingCopyHistory } from "@/lib/services/marketingCopy";
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

    const items = await listMarketingCopyHistory(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取营销文案历史失败。", 500);
  }
}
