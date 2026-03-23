import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listEditHistoryBySource } from "@/lib/services/imageEditing";
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

    const items = await listEditHistoryBySource(supabase, user.id, sourceImageId);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取来源图历史编辑结果失败。", 500);
  }
}
