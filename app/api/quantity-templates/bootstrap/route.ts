import type { QuantityTemplatesBootstrapResponse } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listQuantityTemplates } from "@/lib/services/quantityTemplates";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const payload: QuantityTemplatesBootstrapResponse = {
      items: await listQuantityTemplates(supabase, user.id),
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化数量模板页面失败。", 500);
  }
}
