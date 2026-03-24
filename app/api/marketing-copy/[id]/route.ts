import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getMarketingCopyVersionDetail,
  saveMarketingCopyFinal,
} from "@/lib/services/marketingCopy";
import type { SaveMarketingCopyFinalRequest } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(
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

    const item = await getMarketingCopyVersionDetail(supabase, user.id, id);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取营销文案详情失败。", 500);
  }
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

    const body = (await request.json()) as SaveMarketingCopyFinalRequest;
    const item = await saveMarketingCopyFinal(supabase, user.id, id, body.finalResult);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "保存最终营销文案失败。", 500);
  }
}
