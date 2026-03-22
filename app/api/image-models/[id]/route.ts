import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateImageModelConfig } from "@/lib/services/imageModels";
import type { ImageModelConfigInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

function sanitizeImageModelConfig(record: Record<string, unknown>) {
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

    const body = (await request.json()) as Partial<ImageModelConfigInput>;
    const item = await updateImageModelConfig(supabase, user.id, id, body);
    return jsonOk({ item: sanitizeImageModelConfig(item) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新图片模型配置失败。", 500);
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
      .from("image_model_configs")
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "删除图片模型配置失败。", 500);
  }
}
