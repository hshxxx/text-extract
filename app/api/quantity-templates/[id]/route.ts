import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteQuantityTemplate,
  updateQuantityTemplate,
} from "@/lib/services/quantityTemplates";
import type { QuantityTemplateInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const { id } = await params;
    const body = (await request.json()) as QuantityTemplateInput;
    const item = await updateQuantityTemplate(supabase, user.id, id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新数量模板失败。", 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const { id } = await params;
    await deleteQuantityTemplate(supabase, user.id, id);
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "删除数量模板失败。", 500);
  }
}
