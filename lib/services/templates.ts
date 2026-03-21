import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TEMPLATE_CONTENT, DEFAULT_TEMPLATE_NAME } from "@/utils/constants";
import { validateTemplatePlaceholders } from "@/utils/templateValidation";
import type { TemplateInput, TemplateRecord } from "@/lib/types/domain";

export async function ensureSeedTemplate(
  supabase: SupabaseClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from("templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("templates").insert({
    user_id: userId,
    name: DEFAULT_TEMPLATE_NAME,
    content: DEFAULT_TEMPLATE_CONTENT,
    is_default: true,
    is_seeded: true,
  });

  if (insertError) {
    throw insertError;
  }
}

export function assertTemplateIsValid(content: string) {
  const validation = validateTemplatePlaceholders(content);

  if (!validation.valid) {
    throw new Error(`模板包含未知字段: ${validation.invalid.join(", ")}`);
  }
}

export async function listTemplates(supabase: SupabaseClient, userId: string) {
  await ensureSeedTemplate(supabase, userId);

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TemplateRecord[];
}

export async function createTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: TemplateInput,
) {
  assertTemplateIsValid(input.content);

  if (input.isDefault) {
    await supabase.from("templates").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      name: input.name,
      content: input.content,
      is_default: Boolean(input.isDefault),
      is_seeded: false,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as TemplateRecord;
}

export async function updateTemplate(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<TemplateInput>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw fetchError ?? new Error("模板不存在。");
  }

  const content = input.content ?? existing.content;
  assertTemplateIsValid(content);

  const isDefault = input.isDefault ?? existing.is_default;
  if (isDefault) {
    await supabase.from("templates").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("templates")
    .update({
      name: input.name ?? existing.name,
      content,
      is_default: Boolean(isDefault),
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as TemplateRecord;
}
