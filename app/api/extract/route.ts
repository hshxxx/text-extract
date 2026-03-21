import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runExtraction } from "@/lib/services/extraction";
import type { ExtractionRequest } from "@/lib/types/domain";
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

    const body = (await request.json()) as ExtractionRequest;
    const result = await runExtraction(supabase, user.id, body);
    return jsonOk(result, { status: result.status === "success" ? 200 : 422 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "生成失败。", 500);
  }
}
