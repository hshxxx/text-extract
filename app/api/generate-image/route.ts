import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runImageGeneration } from "@/lib/services/imageGeneration";
import type { ImageGenerationRequest } from "@/lib/types/domain";
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

    const body = (await request.json()) as ImageGenerationRequest;
    const result = await runImageGeneration(supabase, user.id, body);
    return jsonOk(result, { status: result.status === "success" ? 200 : 422 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "图片生成失败。", 500);
  }
}
