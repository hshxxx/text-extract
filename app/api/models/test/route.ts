import { createSupabaseServerClient } from "@/lib/supabase/server";
import { testModelConfig } from "@/lib/services/models";
import type { ModelConfigInput } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const body = (await request.json()) as ModelConfigInput;
    await testModelConfig(body);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "连接测试失败。", 500);
  }
}
