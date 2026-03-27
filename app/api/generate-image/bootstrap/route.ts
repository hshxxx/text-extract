import type { GenerateImageBootstrapResponse } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listExtractionResultsForImage } from "@/lib/services/extractionResults";
import { listImageModelConfigs } from "@/lib/services/imageModels";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const [prompts, imageModels] = await Promise.all([
      listExtractionResultsForImage(supabase, user.id, 50),
      listImageModelConfigs(supabase, user.id),
    ]);

    const payload: GenerateImageBootstrapResponse = {
      prompts,
      imageModels: imageModels.map(({ api_key_encrypted: _secret, ...rest }) => rest),
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化图片生成页面失败。", 500);
  }
}
