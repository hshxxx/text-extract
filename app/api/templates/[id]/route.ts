import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateTemplate } from "@/lib/services/templates";
import type { TemplateInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

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

    const body = (await request.json()) as Partial<TemplateInput>;
    const item = await updateTemplate(supabase, user.id, id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新模板失败。", 500);
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
      .from("templates")
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "删除模板失败。", 500);
  }
}
