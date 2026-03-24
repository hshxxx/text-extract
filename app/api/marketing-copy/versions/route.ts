import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMarketingCopyVersionsByCombo } from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const { searchParams } = new URL(request.url);
    const sourceImageId = searchParams.get("sourceImageId");
    const frontEditJobId = searchParams.get("frontEditJobId");
    const backEditJobId = searchParams.get("backEditJobId");

    if (!sourceImageId || !frontEditJobId || !backEditJobId) {
      return jsonError("缺少必要查询参数。", 400);
    }

    const items = await listMarketingCopyVersionsByCombo(
      supabase,
      user.id,
      sourceImageId,
      frontEditJobId,
      backEditJobId,
    );
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取文案版本列表失败。", 500);
  }
}
