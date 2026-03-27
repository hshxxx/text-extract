import type {
  MarketingCopyBootstrapResponse,
  MarketingCopySourceDetail,
  MarketingCopyVersionListItem,
} from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import {
  getMarketingCopySourceDetail,
  listEligibleMarketingCopySources,
  listMarketingCopyTemplates,
  listMarketingCopyVersionsByCombo,
} from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const requestedSourceId = new URL(request.url).searchParams.get("source");
    const [sources, templates] = await Promise.all([
      listEligibleMarketingCopySources(supabase, user.id, 50),
      listMarketingCopyTemplates(supabase),
    ]);

    const selectedSourceId =
      requestedSourceId && sources.some((item) => item.sourceImageId === requestedSourceId)
        ? requestedSourceId
        : (sources[0]?.sourceImageId ?? null);

    let sourceDetail: MarketingCopySourceDetail | null = null;
    let versions: MarketingCopyVersionListItem[] = [];

    if (selectedSourceId) {
      sourceDetail = await getMarketingCopySourceDetail(supabase, user.id, selectedSourceId);

      if (sourceDetail.defaultFrontEditJobId && sourceDetail.defaultBackEditJobId) {
        versions = await listMarketingCopyVersionsByCombo(
          supabase,
          user.id,
          selectedSourceId,
          sourceDetail.defaultFrontEditJobId,
          sourceDetail.defaultBackEditJobId,
        );
      }
    }

    const payload: MarketingCopyBootstrapResponse = {
      sources,
      templates,
      selectedSourceId,
      sourceDetail,
      versions,
    };

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "初始化营销文案页面失败。", 500);
  }
}
