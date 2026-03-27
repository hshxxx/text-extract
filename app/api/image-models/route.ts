import { requireApiUser } from "@/lib/api-auth";
import { createImageModelConfig, listImageModelConfigs } from "@/lib/services/imageModels";
import type { ImageModelConfigInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

function sanitizeImageModelConfig(record: Record<string, unknown>) {
  const { api_key_encrypted: _secret, ...rest } = record;
  return rest;
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const items = await listImageModelConfigs(supabase, user.id);
    return jsonOk({ items: items.map((item) => sanitizeImageModelConfig(item)) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取图片模型配置失败。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as ImageModelConfigInput;
    const item = await createImageModelConfig(supabase, user.id, body);
    return jsonOk({ item: sanitizeImageModelConfig(item) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建图片模型配置失败。", 500);
  }
}
