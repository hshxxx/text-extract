import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exportProductsToGoogleSheets } from "@/lib/services/exportToSheets";
import type { ExportPreviewRequest } from "@/lib/types/domain";
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

    const body = (await request.json()) as ExportPreviewRequest;
    const item = await exportProductsToGoogleSheets(supabase, user.id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "导出到 Google Sheets 失败。", 500);
  }
}
