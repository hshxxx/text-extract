import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listExtractionResultsForImage } from "@/lib/services/extractionResults";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const items = await listExtractionResultsForImage(supabase, user.id, limit);

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取 Prompt 列表失败。", 500);
  }
}
