import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/utils/encryption";
import { parseModelJson } from "@/utils/jsonRepair";
import { normalizeStructuredData } from "@/utils/schema";
import { renderTemplate } from "@/utils/templateRenderer";
import { EXTRACTION_RATE_LIMIT, MAX_INPUT_LENGTH } from "@/utils/constants";
import { getLlmAdapter } from "@/lib/services/llm";
import type { ExtractionRequest, ExtractionResponse, ModelConfigRecord, TemplateRecord } from "@/lib/types/domain";

async function assertRateLimit(supabase: SupabaseClient, userId: string) {
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabase
    .from("extraction_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", minuteAgo);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= EXTRACTION_RATE_LIMIT) {
    throw new Error("请求过于频繁，请稍后再试。");
  }
}

async function loadDependencies(
  supabase: SupabaseClient,
  userId: string,
  input: ExtractionRequest,
) {
  const [{ data: modelConfig, error: modelError }, { data: template, error: templateError }] =
    await Promise.all([
      supabase
        .from("model_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("id", input.modelConfigId)
        .single(),
      supabase.from("templates").select("*").eq("user_id", userId).eq("id", input.templateId).single(),
    ]);

  if (modelError || !modelConfig) {
    throw modelError ?? new Error("模型配置不存在。");
  }

  if (templateError || !template) {
    throw templateError ?? new Error("模板不存在。");
  }

  return {
    modelConfig: modelConfig as ModelConfigRecord,
    template: template as TemplateRecord,
  };
}

export async function runExtraction(
  supabase: SupabaseClient,
  userId: string,
  input: ExtractionRequest,
): Promise<ExtractionResponse> {
  if (!input.rawInput.trim()) {
    throw new Error("请输入待解析文本。");
  }

  if (input.rawInput.length > MAX_INPUT_LENGTH) {
    throw new Error(`输入内容不能超过 ${MAX_INPUT_LENGTH} 个字符。`);
  }

  await assertRateLimit(supabase, userId);

  const { modelConfig, template } = await loadDependencies(supabase, userId, input);
  const adapter = getLlmAdapter(modelConfig.provider);

  const { data: job, error: jobInsertError } = await supabase
    .from("extraction_jobs")
    .insert({
      user_id: userId,
      model_config_id: modelConfig.id,
      template_id: template.id,
      status: "processing",
      raw_input: input.rawInput,
      template_snapshot: template.content,
    })
    .select("id")
    .single();

  if (jobInsertError || !job) {
    throw jobInsertError ?? new Error("无法创建任务记录。");
  }

  let rawModelOutput: string | null = null;

  try {
    rawModelOutput = await adapter.extractStructuredData({
      modelConfig: {
        model: modelConfig.model,
        base_url: modelConfig.base_url,
        apiKey: decryptSecret(modelConfig.api_key_encrypted),
      },
      rawInput: input.rawInput,
    });

    const parsed = parseModelJson(rawModelOutput);
    const structuredData = normalizeStructuredData(parsed);
    const finalPrompt = renderTemplate(template.content, structuredData);

    const { error: updateError } = await supabase
      .from("extraction_jobs")
      .update({
        status: "success",
        raw_model_output: rawModelOutput,
        structured_data: structuredData,
        final_prompt: finalPrompt,
        error_message: null,
      })
      .eq("id", job.id)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    return {
      jobId: job.id,
      status: "success",
      structuredData,
      finalPrompt,
      rawModelOutput,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败。";

    await supabase
      .from("extraction_jobs")
      .update({
        status: "failed",
        raw_model_output: rawModelOutput,
        error_message: message,
      })
      .eq("id", job.id)
      .eq("user_id", userId);

    return {
      jobId: job.id,
      status: "failed",
      structuredData: null,
      finalPrompt: null,
      errorMessage: message,
    };
  }
}
