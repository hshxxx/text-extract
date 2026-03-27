import { requireApiUser } from "@/lib/api-auth";
import { createModelConfig, listModelConfigs } from "@/lib/services/models";
import type { ModelConfigInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

function sanitizeModelConfig(record: Record<string, unknown>) {
  const { api_key_encrypted: _secret, ...rest } = record;
  return rest;
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const items = await listModelConfigs(supabase, user.id);
    return jsonOk({ items: items.map((item) => sanitizeModelConfig(item)) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取模型配置失败。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as ModelConfigInput;
    const item = await createModelConfig(supabase, user.id, body);
    return jsonOk({ item: sanitizeModelConfig(item) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建模型配置失败。", 500);
  }
}
