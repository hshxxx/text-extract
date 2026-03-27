import type { ExtractBootstrapResponse } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listModelConfigs } from "@/lib/services/models";
import { listTemplates } from "@/lib/services/templates";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const [models, templates] = await Promise.all([
      listModelConfigs(supabase, user.id),
      listTemplates(supabase, user.id),
    ]);

    const payload: ExtractBootstrapResponse = {
      models: models.map(({ api_key_encrypted: _secret, ...rest }) => rest),
      templates,
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化文本解析页面失败。", 500);
  }
}
