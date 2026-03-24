import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  QuantityTemplateInput,
  QuantityTemplateRecord,
  QuantityTemplateTier,
} from "@/lib/types/domain";

const quantityTierSchema = z.object({
  optionValue: z.string().trim().min(1),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative(),
  inventoryQty: z.coerce.number().int().nonnegative(),
});

const quantityTemplateSchema = z.object({
  name: z.string().trim().min(1),
  isDefault: z.boolean().optional().default(false),
  tiers: z.array(quantityTierSchema).min(1),
});

function normalizeTiers(value: unknown) {
  return z.array(quantityTierSchema).parse(value) as QuantityTemplateTier[];
}

async function clearDefaultTemplate(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("quantity_templates")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (error) {
    throw new Error(`更新默认数量模板失败：${error.message}`);
  }
}

export async function listQuantityTemplates(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("quantity_templates")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("is_seeded", { ascending: false })
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`获取数量模板失败：${error.message}`);
  }

  return ((data ?? []) as QuantityTemplateRecord[]).map((item) => ({
    ...item,
    tiers_json: normalizeTiers(item.tiers_json),
  }));
}

export async function getQuantityTemplateById(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
) {
  const { data, error } = await supabase
    .from("quantity_templates")
    .select("*")
    .eq("id", templateId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    throw new Error(`读取数量模板失败：${error.message}`);
  }

  if (!data) {
    throw new Error("数量模板不存在。");
  }

  return {
    ...(data as QuantityTemplateRecord),
    tiers_json: normalizeTiers(data.tiers_json),
  };
}

export async function resolveDefaultQuantityTemplate(supabase: SupabaseClient, userId: string) {
  const templates = await listQuantityTemplates(supabase, userId);
  return (
    templates.find((item) => item.user_id === userId && item.is_default) ??
    templates.find((item) => item.is_seeded) ??
    templates[0] ??
    null
  );
}

export async function createQuantityTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: QuantityTemplateInput,
) {
  const normalized = quantityTemplateSchema.parse(input);

  if (normalized.isDefault) {
    await clearDefaultTemplate(supabase, userId);
  }

  const { data, error } = await supabase
    .from("quantity_templates")
    .insert({
      user_id: userId,
      name: normalized.name,
      is_default: normalized.isDefault,
      is_seeded: false,
      tiers_json: normalized.tiers,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "创建数量模板失败。");
  }

  return {
    ...(data as QuantityTemplateRecord),
    tiers_json: normalizeTiers(data.tiers_json),
  };
}

export async function updateQuantityTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  input: QuantityTemplateInput,
) {
  const current = await getQuantityTemplateById(supabase, userId, templateId);

  if (current.user_id !== userId) {
    throw new Error("系统预置模板不允许直接修改。");
  }

  const normalized = quantityTemplateSchema.parse(input);

  if (normalized.isDefault) {
    await clearDefaultTemplate(supabase, userId);
  }

  const { data, error } = await supabase
    .from("quantity_templates")
    .update({
      name: normalized.name,
      is_default: normalized.isDefault,
      tiers_json: normalized.tiers,
    })
    .eq("id", templateId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "更新数量模板失败。");
  }

  return {
    ...(data as QuantityTemplateRecord),
    tiers_json: normalizeTiers(data.tiers_json),
  };
}

export async function deleteQuantityTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
) {
  const current = await getQuantityTemplateById(supabase, userId, templateId);

  if (current.user_id !== userId) {
    throw new Error("系统预置模板不允许删除。");
  }

  const { error } = await supabase
    .from("quantity_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`删除数量模板失败：${error.message}`);
  }
}
