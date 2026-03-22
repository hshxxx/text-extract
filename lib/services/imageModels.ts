import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/utils/encryption";
import { getImageAdapter } from "@/lib/services/image-adapter";
import type { ImageModelConfigInput, ImageModelConfigRecord } from "@/lib/types/domain";

export async function listImageModelConfigs(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("image_model_configs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ImageModelConfigRecord[];
}

export async function testImageModelConfig(input: ImageModelConfigInput) {
  const adapter = getImageAdapter(input.provider);
  await adapter.testConnection(input);
}

export async function createImageModelConfig(
  supabase: SupabaseClient,
  userId: string,
  input: ImageModelConfigInput,
) {
  await testImageModelConfig(input);

  if (input.isDefault) {
    await supabase.from("image_model_configs").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("image_model_configs")
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

  return data as ImageModelConfigRecord;
}

export async function updateImageModelConfig(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<ImageModelConfigInput>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("image_model_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    throw fetchError ?? new Error("图片模型配置不存在。");
  }

  const apiKey = input.apiKey?.trim() ? input.apiKey : decryptSecret(existing.api_key_encrypted);
  const payload: ImageModelConfigInput = {
    name: input.name ?? existing.name,
    provider: input.provider ?? existing.provider,
    model: input.model ?? existing.model,
    baseUrl: input.baseUrl ?? existing.base_url ?? undefined,
    apiKey,
    isDefault: input.isDefault ?? existing.is_default,
  };

  await testImageModelConfig(payload);

  if (payload.isDefault) {
    await supabase.from("image_model_configs").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("image_model_configs")
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

  return data as ImageModelConfigRecord;
}
