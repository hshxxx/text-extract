import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/utils/encryption";
import { getLlmAdapter } from "@/lib/services/llm";
import type { ModelConfigInput, ModelConfigRecord } from "@/lib/types/domain";

export async function listModelConfigs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("model_configs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ModelConfigRecord[];
}

export async function setDefaultModel(
  supabase: SupabaseClient,
  userId: string,
  modelId: string,
) {
  const { error: clearError } = await supabase
    .from("model_configs")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (clearError) {
    throw clearError;
  }

  const { error } = await supabase
    .from("model_configs")
    .update({ is_default: true })
    .eq("user_id", userId)
    .eq("id", modelId);

  if (error) {
    throw error;
  }
}

export async function testModelConfig(input: ModelConfigInput) {
  if (input.provider !== "openai") {
    throw new Error("首版仅开放 OpenAI 兼容配置。");
  }

  const adapter = getLlmAdapter(input.provider);
  await adapter.testConnection(input);
}

export async function createModelConfig(
  supabase: SupabaseClient,
  userId: string,
  input: ModelConfigInput,
) {
  await testModelConfig(input);

  if (input.isDefault) {
    await supabase.from("model_configs").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("model_configs")
    .insert({
      user_id: userId,
      name: input.name,
      provider: input.provider,
      model: input.model,
      base_url: input.baseUrl || null,
      api_key_encrypted: encryptSecret(input.apiKey),
      is_default: Boolean(input.isDefault),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ModelConfigRecord;
}

export async function updateModelConfig(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<ModelConfigInput>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("model_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw fetchError ?? new Error("模型配置不存在。");
  }

  const apiKey = input.apiKey?.trim() ? input.apiKey : decryptSecret(existing.api_key_encrypted);
  const payload: ModelConfigInput = {
    name: input.name ?? existing.name,
    provider: (input.provider ?? existing.provider) as ModelConfigInput["provider"],
    model: input.model ?? existing.model,
    baseUrl: input.baseUrl ?? existing.base_url ?? undefined,
    apiKey,
    isDefault: input.isDefault ?? existing.is_default,
  };

  await testModelConfig(payload);

  if (payload.isDefault) {
    await supabase.from("model_configs").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("model_configs")
    .update({
      name: payload.name,
      provider: payload.provider,
      model: payload.model,
      base_url: payload.baseUrl || null,
      api_key_encrypted: input.apiKey?.trim()
        ? encryptSecret(input.apiKey)
        : existing.api_key_encrypted,
      is_default: Boolean(payload.isDefault),
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ModelConfigRecord;
}
