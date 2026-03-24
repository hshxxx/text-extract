import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createQuantityTemplate,
  listQuantityTemplates,
} from "@/lib/services/quantityTemplates";
import type { QuantityTemplateInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const items = await listQuantityTemplates(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取数量模板失败。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as QuantityTemplateInput;
    const item = await createQuantityTemplate(supabase, user.id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建数量模板失败。", 500);
  }
}
