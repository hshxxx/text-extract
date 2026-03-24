import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmMarketingCopyVersion } from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const item = await confirmMarketingCopyVersion(supabase, user.id, id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "确认营销文案失败。", 500);
  }
}
