import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateMarketingCopyVersion } from "@/lib/services/marketingCopy";
import type { GenerateMarketingCopyRequest } from "@/lib/types/domain";
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

    const body = (await request.json()) as GenerateMarketingCopyRequest;
    const item = await generateMarketingCopyVersion(supabase, user.id, body);
    return jsonOk({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "生成营销文案失败。", 500);
  }
}
