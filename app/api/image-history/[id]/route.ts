import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getImageHistoryItem } from "@/lib/services/imageGeneration";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(
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

    const item = await getImageHistoryItem(supabase, user.id, id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取图片历史详情失败。", 500);
  }
}
