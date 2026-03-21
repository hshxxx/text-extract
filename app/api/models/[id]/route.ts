import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateModelConfig } from "@/lib/services/models";
import type { ModelConfigInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

function sanitizeModelConfig(record: Record<string, unknown>) {
  const { api_key_encrypted: _secret, ...rest } = record;
  return rest;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as Partial<ModelConfigInput>;
    const item = await updateModelConfig(supabase, user.id, id, body);
    return jsonOk({ item: sanitizeModelConfig(item) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新模型配置失败。", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const { error } = await supabase
      .from("model_configs")
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "删除模型配置失败。", 500);
  }
}
