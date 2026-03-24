import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMarketingCopyTemplates } from "@/lib/services/marketingCopy";
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

    const items = await listMarketingCopyTemplates(supabase);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取文案模板失败。", 500);
  }
}
