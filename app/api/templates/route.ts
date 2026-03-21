import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTemplate, listTemplates } from "@/lib/services/templates";
import type { TemplateInput } from "@/lib/types/domain";
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

    const items = await listTemplates(supabase, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取模板失败。", 500);
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

    const body = (await request.json()) as TemplateInput;
    const item = await createTemplate(supabase, user.id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建模板失败。", 500);
  }
}
