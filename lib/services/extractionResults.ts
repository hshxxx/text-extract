import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractionResultListItem } from "@/lib/types/domain";

export async function listExtractionResultsForImage(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("id, final_prompt, created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .not("final_prompt", "is", null)
    .neq("final_prompt", "")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id as string,
    prompt: item.final_prompt as string,
    created_at: item.created_at as string,
  })) as ExtractionResultListItem[];
}
