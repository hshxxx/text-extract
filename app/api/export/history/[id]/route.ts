import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExportHistoryDetail } from "@/lib/services/exportToSheets";
import { jsonError, jsonOk } from "@/utils/http";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const { id } = await params;
    const item = await getExportHistoryDetail(supabase, user.id, id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取导出历史详情失败。", 500);
  }
}
