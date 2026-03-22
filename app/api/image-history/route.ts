import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listImageHistory } from "@/lib/services/imageGeneration";
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

    const items = await listImageHistory(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取图片历史记录失败。", 500);
  }
}
