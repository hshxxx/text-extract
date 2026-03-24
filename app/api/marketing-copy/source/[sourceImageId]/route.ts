import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMarketingCopySourceDetail } from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sourceImageId: string }> },
) {
  try {
    const { sourceImageId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const item = await getMarketingCopySourceDetail(supabase, user.id, sourceImageId);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取素材详情失败。", 500);
  }
}
