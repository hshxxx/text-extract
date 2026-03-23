import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { decryptSecret } from "@/utils/encryption";
import {
  IMAGE_GENERATION_RATE_LIMIT_PER_DAY,
  IMAGE_STORAGE_BUCKET,
} from "@/utils/constants";
import { getImageAdapter } from "@/lib/services/image-adapter";
import type {
  ExtractionJobRecord,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationResultRecord,
  ImageGenerationTaskRecord,
  ImageHistoryDetail,
  ImageHistoryItem,
  ImageModelConfigRecord,
} from "@/lib/types/domain";

function startOfUtcDayIso(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

export function buildImageGenerationPrompt(sourcePrompt: string) {
  return `Create a high-quality commemorative challenge coin design image.

Interpret the following prompt as design instructions for the coin itself, not as text to be typeset on a document, poster, card, or layout.

Render both the obverse and reverse of the same coin in one image.
Show the two coin faces side by side, with equal visual weight, centered composition, and enough outer margin so both full coin rims are completely visible.
Do not crop, truncate, or cut off any part of either coin.
The coin should look like a real minted commemorative coin with metallic material, embossed relief, precise engraving, realistic texture, and clean studio product lighting.

Composition requirements:
- Both coin faces must be fully visible within the frame.
- Keep the entire circular outline and rim of each coin complete.
- Avoid close-up framing that cuts off the edges.
- Make the obverse and reverse similar in size and prominence.
- Use a balanced, product-style composition suitable for later image processing.

Design density requirements:
- Both the obverse and reverse should feel visually complete and well-filled, not sparse.
- Avoid large empty blank areas on either coin face.
- Expand each side with supporting engraved details that match the theme, such as decorative border motifs, laurel elements, stars, relief patterns, texture, symbolic secondary elements, or background engraving.
- Keep both sides coherent and collectible in style, while making each coin face rich enough for a premium commemorative coin design.
- The obverse may be more narrative and figurative, while the reverse should still remain visually substantial and not look empty.

Important constraints:
- Do not generate a poster, page, slide, instruction card, or typography layout.
- Do not place large blocks of explanatory text outside the coin.
- Any wording provided in the design should appear only as engraved inscription on the coin surface.
- Do not show UI, labels, callouts, borders, or document mockups.
- Focus on the coin artwork itself.

Design instructions:
${sourcePrompt}`;
}

async function assertImageRateLimit(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("image_generation_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfUtcDayIso());

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= IMAGE_GENERATION_RATE_LIMIT_PER_DAY) {
    throw new Error(`每日图片生成次数已达上限（${IMAGE_GENERATION_RATE_LIMIT_PER_DAY} 次）。`);
  }
}

async function loadGenerationDependencies(
  supabase: SupabaseClient,
  userId: string,
  input: ImageGenerationRequest,
) {
  const [{ data: extractionJob, error: extractionError }, { data: imageModel, error: modelError }] =
    await Promise.all([
      supabase
        .from("extraction_jobs")
        .select("*")
        .eq("user_id", userId)
        .eq("id", input.extractionResultId)
        .eq("status", "success")
        .single(),
      supabase
        .from("image_model_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("id", input.imageModelConfigId)
        .single(),
    ]);

  if (extractionError || !extractionJob) {
    throw extractionError ?? new Error("来源 Prompt 不存在。");
  }

  if (!extractionJob.final_prompt) {
    throw new Error("来源任务没有可用 Prompt。");
  }

  if (modelError || !imageModel) {
    throw modelError ?? new Error("图片模型配置不存在。");
  }

  return {
    extractionJob: extractionJob as ExtractionJobRecord,
    imageModel: imageModel as ImageModelConfigRecord,
  };
}

async function downloadProviderImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`下载生成图片失败: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") || "image/png",
  };
}

function getFileExtension(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "png";
}

export async function uploadGeneratedImageToStorage(
  supabase: SupabaseClient,
  userId: string,
  image: { bytes: Buffer; contentType: string },
) {
  const now = new Date();
  const ext = getFileExtension(image.contentType);
  const path = [
    userId,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${Date.now()}-${randomUUID()}.${ext}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_STORAGE_BUCKET)
    .upload(path, image.bytes, {
      contentType: image.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(IMAGE_STORAGE_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

export async function runImageGeneration(
  supabase: SupabaseClient,
  userId: string,
  input: ImageGenerationRequest,
): Promise<ImageGenerationResponse> {
  await assertImageRateLimit(supabase, userId);

  const { extractionJob, imageModel } = await loadGenerationDependencies(supabase, userId, input);
  const adapter = getImageAdapter(imageModel.provider);
  const sourcePrompt = extractionJob.final_prompt;

  if (!sourcePrompt) {
    throw new Error("来源任务没有可用 Prompt。");
  }

  const { data: task, error: taskInsertError } = await supabase
    .from("image_generation_tasks")
    .insert({
      user_id: userId,
      extraction_job_id: extractionJob.id,
      image_model_config_id: imageModel.id,
      image_size: input.imageSize,
      status: "processing",
    })
    .select("*")
    .single();

  if (taskInsertError || !task) {
    throw taskInsertError ?? new Error("无法创建图片生成任务。");
  }

  try {
    const imagePrompt = buildImageGenerationPrompt(sourcePrompt);

    const generated = await adapter.generateImage({
      modelConfig: {
        model: imageModel.model,
        base_url: imageModel.base_url,
        apiKey: decryptSecret(imageModel.api_key_encrypted),
      },
      prompt: imagePrompt,
      size: input.imageSize,
    });

    const downloaded = generated.bytesBase64
      ? {
          bytes: Buffer.from(generated.bytesBase64, "base64"),
          contentType: generated.contentType || "image/png",
        }
      : generated.providerImageUrl
        ? await downloadProviderImage(generated.providerImageUrl)
        : null;

    if (!downloaded) {
      throw new Error("图片生成接口没有返回可保存的图片数据。");
    }

    const uploaded = await uploadGeneratedImageToStorage(supabase, userId, downloaded);

    const { data: resultRecord, error: resultError } = await supabase
      .from("image_generation_results")
      .insert({
        task_id: task.id,
        storage_path: uploaded.path,
        image_url: uploaded.publicUrl,
        provider_image_url: generated.providerImageUrl,
        model: imageModel.model,
        seed: generated.seed ?? null,
      })
      .select("*")
      .single();

    if (resultError || !resultRecord) {
      throw resultError ?? new Error("无法保存图片生成结果。");
    }

    const { error: taskUpdateError } = await supabase
      .from("image_generation_tasks")
      .update({
        status: "success",
        error_message: null,
      })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (taskUpdateError) {
      throw taskUpdateError;
    }

    return {
      taskId: task.id,
      imageResultId: resultRecord.id,
      status: "success",
      imageUrl: uploaded.publicUrl,
      sourcePrompt,
      extractionJobId: extractionJob.id,
      imageSize: input.imageSize,
      modelName: imageModel.name,
      seed: generated.seed ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片生成失败。";

    await supabase
      .from("image_generation_tasks")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", task.id)
      .eq("user_id", userId);

    return {
      taskId: task.id,
      imageResultId: null,
      status: "failed",
      imageUrl: null,
      sourcePrompt,
      extractionJobId: extractionJob.id,
      imageSize: input.imageSize,
      modelName: imageModel.name,
      errorMessage: message,
    };
  }
}

export async function listImageHistory(supabase: SupabaseClient, userId: string) {
  const { data: tasks, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (taskError) {
    throw taskError;
  }

  const taskList = (tasks ?? []) as ImageGenerationTaskRecord[];

  if (taskList.length === 0) {
    return [] as ImageHistoryItem[];
  }

  const [resultsResponse, modelResponse, extractionResponse] = await Promise.all([
    supabase
      .from("image_generation_results")
      .select("*")
      .in(
        "task_id",
        taskList.map((item) => item.id),
      ),
    supabase
      .from("image_model_configs")
      .select("id, name")
      .in(
        "id",
        taskList
          .map((item) => item.image_model_config_id)
          .filter((value): value is string => Boolean(value)),
      ),
    supabase
      .from("extraction_jobs")
      .select("id, final_prompt")
      .in(
        "id",
        taskList.map((item) => item.extraction_job_id),
      ),
  ]);

  if (resultsResponse.error) {
    throw resultsResponse.error;
  }

  if (modelResponse.error) {
    throw modelResponse.error;
  }

  if (extractionResponse.error) {
    throw extractionResponse.error;
  }

  const resultsByTaskId = new Map(
    ((resultsResponse.data ?? []) as ImageGenerationResultRecord[]).map((item) => [item.task_id, item]),
  );
  const modelNameById = new Map(
    ((modelResponse.data ?? []) as Array<{ id: string; name: string }>).map((item) => [item.id, item.name]),
  );
  const promptByExtractionId = new Map(
    ((extractionResponse.data ?? []) as Array<{ id: string; final_prompt: string | null }>).map((item) => [
      item.id,
      item.final_prompt ?? "",
    ]),
  );

  return taskList.map((task) => {
    const prompt = promptByExtractionId.get(task.extraction_job_id) ?? "";
    const result = resultsByTaskId.get(task.id);

    return {
      taskId: task.id,
      extractionJobId: task.extraction_job_id,
      prompt,
      promptPreview: prompt.slice(0, 120) || "无 Prompt",
      imageSize: task.image_size,
      status: task.status,
      createdAt: task.created_at,
      modelName: task.image_model_config_id
        ? (modelNameById.get(task.image_model_config_id) ?? "已删除模型")
        : "已删除模型",
      imageUrl: result?.image_url ?? null,
      errorMessage: task.error_message,
    };
  });
}

export async function getImageHistoryItem(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data: task, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw taskError ?? new Error("图片历史记录不存在。");
  }

  const imageTask = task as ImageGenerationTaskRecord;

  const [{ data: result }, { data: extractionJob, error: extractionError }, { data: model }] =
    await Promise.all([
      supabase
        .from("image_generation_results")
        .select("*")
        .eq("task_id", imageTask.id)
        .maybeSingle(),
      supabase
        .from("extraction_jobs")
        .select("id, final_prompt")
        .eq("user_id", userId)
        .eq("id", imageTask.extraction_job_id)
        .single(),
      imageTask.image_model_config_id
        ? supabase
            .from("image_model_configs")
            .select("id, name")
            .eq("user_id", userId)
            .eq("id", imageTask.image_model_config_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (extractionError || !extractionJob) {
    throw extractionError ?? new Error("来源提取任务不存在。");
  }

  return {
    task: imageTask,
    result: (result as ImageGenerationResultRecord | null) ?? null,
    sourcePrompt: (extractionJob.final_prompt as string | null) ?? "",
    modelName: (model as { id: string; name: string } | null)?.name ?? "已删除模型",
  } satisfies ImageHistoryDetail;
}
