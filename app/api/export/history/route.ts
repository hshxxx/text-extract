import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listExportHistory } from "@/lib/services/exportToSheets";
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

    const items = await listExportHistory(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取导出历史失败。", 500);
  }
}
