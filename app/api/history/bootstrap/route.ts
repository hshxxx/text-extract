import type { HistoryBootstrapResponse, HistoryTab } from "@/lib/types/domain";
import { requireApiUser } from "@/lib/api-auth";
import { listExportHistory } from "@/lib/services/exportToSheets";
import { listHistory } from "@/lib/services/history";
import { listEditHistory } from "@/lib/services/imageEditing";
import { listImageHistory } from "@/lib/services/imageGeneration";
import { listMarketingCopyHistory } from "@/lib/services/marketingCopy";
import { jsonError, jsonOk } from "@/utils/http";

const ALLOWED_TABS: HistoryTab[] = ["text", "image", "edit", "marketing", "export"];

function getTab(url: string): HistoryTab {
  const tab = new URL(url).searchParams.get("tab");
  return ALLOWED_TABS.includes(tab as HistoryTab) ? (tab as HistoryTab) : "text";
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return jsonError("未登录。", 401);
    }

    const tab = getTab(request.url);
    const payload: HistoryBootstrapResponse = { tab };

    if (tab === "text") {
      payload.textItems = await listHistory(supabase, user.id);
    } else if (tab === "image") {
      payload.imageItems = await listImageHistory(supabase, user.id);
    } else if (tab === "edit") {
      payload.editItems = await listEditHistory(supabase, user.id);
    } else if (tab === "marketing") {
      payload.marketingItems = await listMarketingCopyHistory(supabase, user.id);
    } else {
      payload.exportItems = await listExportHistory(supabase, user.id);
    }

    return jsonOk(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取历史记录失败。", 500);
  }
}
