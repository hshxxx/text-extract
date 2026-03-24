import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listExportableProducts } from "@/lib/services/exportToSheets";
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

    const items = await listExportableProducts(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取导出商品列表失败。", 500);
  }
}
