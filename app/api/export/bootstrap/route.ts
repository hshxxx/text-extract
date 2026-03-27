import type { ExportBootstrapResponse } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listExportableProducts } from "@/lib/services/exportToSheets";
import { listQuantityTemplates } from "@/lib/services/quantityTemplates";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const [products, templates] = await Promise.all([
      listExportableProducts(supabase, user.id, 20),
      listQuantityTemplates(supabase, user.id),
    ]);

    const payload: ExportBootstrapResponse = {
      products,
      templates,
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化导出页面失败。", 500);
  }
}
