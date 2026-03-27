import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractionJobRecord } from "@/lib/types/domain";

export async function listHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("id, user_id, status, raw_input, final_prompt, error_message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as ExtractionJobRecord[];
}

export async function getHistoryItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as ExtractionJobRecord;
}
