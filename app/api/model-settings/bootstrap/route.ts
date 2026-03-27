import type { ModelSettingsBootstrapResponse } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listImageModelConfigs } from "@/lib/services/imageModels";
import { listModelConfigs } from "@/lib/services/models";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const [textItems, imageItems] = await Promise.all([
      listModelConfigs(supabase, user.id),
      listImageModelConfigs(supabase, user.id),
    ]);

    const payload: ModelSettingsBootstrapResponse = {
      textItems: textItems.map(({ api_key_encrypted: _secret, ...rest }) => rest),
      imageItems: imageItems.map(({ api_key_encrypted: _secret, ...rest }) => rest),
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化模型配置页面失败。", 500);
  }
}
