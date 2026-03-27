import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { decryptSecret } from "@/utils/encryption";
import { parseModelJson } from "@/utils/jsonRepair";
import {
  MARKETING_COPY_RETRY_DELAYS_MS,
  MARKETING_COPY_TIMEOUT_MS,
} from "@/utils/constants";
import type {
  EditJobRecord,
  ExtractionJobRecord,
  ImageGenerationResultRecord,
  ImageGenerationTaskRecord,
  MarketingCopyHistoryItem,
  MarketingCopyLocalizedText,
  MarketingCopyResult,
  MarketingCopySourceDetail,
  MarketingCopySourceItem,
  MarketingCopyTemplateRecord,
  MarketingCopyVersionDetail,
  MarketingCopyVersionListItem,
  MarketingCopyVersionRecord,
  ModelConfigRecord,
} from "@/lib/types/domain";

const localizedTextSchema = z.object({
  en: z.string().optional().default(""),
  cn: z.string().optional().default(""),
});

const marketingCopyResultSchema = z.object({
  shopify: z.object({
    title: localizedTextSchema.optional().default({ en: "", cn: "" }),
    subtitle: localizedTextSchema.optional().default({ en: "", cn: "" }),
    selling_points: z.array(localizedTextSchema).optional().default([]),
    description: localizedTextSchema.optional().default({ en: "", cn: "" }),
  }),
  facebook: z.object({
    primary_text: localizedTextSchema.optional().default({ en: "", cn: "" }),
    headline: localizedTextSchema.optional().default({ en: "", cn: "" }),
    description: localizedTextSchema.optional().default({ en: "", cn: "" }),
    cta_suggestion: localizedTextSchema.optional().default({ en: "", cn: "" }),
  }),
});

type ResolvedSourceBundle = {
  result: ImageGenerationResultRecord;
  imageTask: ImageGenerationTaskRecord;
  extractionJob: ExtractionJobRecord;
};

type ResolvedEditSelection = {
  front: EditJobRecord;
  back: EditJobRecord;
};

function getBaseUrl(baseUrl?: string | null) {
  const normalized = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized.slice(0, -"/chat/completions".length);
  }
  return normalized;
}

async function withRetry<T>(runner: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MARKETING_COPY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await runner();
    } catch (error) {
      lastError = error;
      if (attempt === MARKETING_COPY_RETRY_DELAYS_MS.length) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, MARKETING_COPY_RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
}

function toLocalizedText(value: unknown): MarketingCopyLocalizedText {
  const parsed = localizedTextSchema.parse(value);
  return {
    en: typeof parsed.en === "string" ? parsed.en.trim() : "",
    cn: typeof parsed.cn === "string" ? parsed.cn.trim() : "",
  };
}

function ensureShopifyDescription(value: string, language: "en" | "cn") {
  const text = value.trim();

  if (language === "en") {
    const headings = ["Overview", "Front Design", "Back Design", "Why This Coin Stands Out"];
    if (headings.every((heading) => text.includes(heading))) {
      return text;
    }

    return [
      "Overview",
      text || "A premium commemorative challenge coin created to honor the theme, symbolism, and story behind this design.",
      "",
      "Front Design",
      "Describe the obverse composition, engraved wording, and main visual symbols shown on the coin.",
      "",
      "Back Design",
      "Explain the reverse artwork, engraved text, and symbolic meaning represented on the back of the coin.",
      "",
      "Why This Coin Stands Out",
      "Highlight the emotional value, display quality, gifting appeal, and collectible craftsmanship of this challenge coin.",
    ].join("\n");
  }

  const headings = ["概览", "正面设计", "背面设计", "这枚纪念币为何脱颖而出"];
  if (headings.every((heading) => text.includes(heading))) {
    return text;
  }

  return [
    "概览",
    text || "这是一枚围绕主题、纪念意义与象征元素打造的高品质纪念币，适合收藏、陈列与纪念赠礼。",
    "",
    "正面设计",
    "说明纪念币正面的主要画面、浮雕元素、刻字内容和整体视觉表达。",
    "",
    "背面设计",
    "说明纪念币背面的主要元素、文字布局以及象征含义。",
    "",
    "这枚纪念币为何脱颖而出",
    "总结这枚纪念币的纪念价值、礼赠意义、收藏属性和工艺质感。",
  ].join("\n");
}

function normalizeMarketingCopyResult(value: unknown): MarketingCopyResult {
  const parsed = marketingCopyResultSchema.parse(value);
  const sellingPoints = [...parsed.shopify.selling_points].slice(0, 4).map(toLocalizedText);

  while (sellingPoints.length < 4) {
    sellingPoints.push({ en: "", cn: "" });
  }

  return {
    shopify: {
      title: toLocalizedText(parsed.shopify.title),
      subtitle: toLocalizedText(parsed.shopify.subtitle),
      selling_points: sellingPoints,
      description: {
        en: ensureShopifyDescription(toLocalizedText(parsed.shopify.description).en, "en"),
        cn: ensureShopifyDescription(toLocalizedText(parsed.shopify.description).cn, "cn"),
      },
    },
    facebook: {
      primary_text: toLocalizedText(parsed.facebook.primary_text),
      headline: toLocalizedText(parsed.facebook.headline),
      description: toLocalizedText(parsed.facebook.description),
      cta_suggestion: toLocalizedText(parsed.facebook.cta_suggestion),
    },
  };
}

function buildMarketingCopySystemPrompt() {
  return [
    "You generate bilingual ecommerce marketing copy for commemorative challenge coins.",
    "Return JSON only.",
    "Do not output markdown.",
    "The JSON must follow this exact structure:",
    "{",
    '  "shopify": {',
    '    "title": { "en": "", "cn": "" },',
    '    "subtitle": { "en": "", "cn": "" },',
    '    "selling_points": [',
    '      { "en": "", "cn": "" },',
    '      { "en": "", "cn": "" },',
    '      { "en": "", "cn": "" },',
    '      { "en": "", "cn": "" }',
    "    ],",
    '    "description": { "en": "", "cn": "" }',
    "  },",
    '  "facebook": {',
    '    "primary_text": { "en": "", "cn": "" },',
    '    "headline": { "en": "", "cn": "" },',
    '    "description": { "en": "", "cn": "" },',
    '    "cta_suggestion": { "en": "", "cn": "" }',
    "  }",
    "}",
    "Requirements:",
    "- Shopify selling_points must contain exactly 4 items.",
    "- Shopify description in English must include sections: Overview, Front Design, Back Design, Why This Coin Stands Out.",
    "- Shopify description in Chinese must include sections: 概览, 正面设计, 背面设计, 这枚纪念币为何脱颖而出.",
    "- Facebook copy should be concise, persuasive, and ad-ready.",
    "- Preserve factual consistency with the uploaded coin images and source theme.",
  ].join("\n");
}

function buildMarketingCopyUserPrompt({
  template,
  rawInput,
  promptPreview,
  userInstruction,
}: {
  template: MarketingCopyTemplateRecord;
  rawInput: string;
  promptPreview: string;
  userInstruction?: string | null;
}) {
  return [
    `Selected template: ${template.name}`,
    `Template description: ${template.description}`,
    `Template guidance: ${template.prompt_guidance}`,
    "",
    "Original user theme input:",
    rawInput,
    "",
    "Current design prompt summary:",
    promptPreview,
    "",
    "Task:",
    "- Create bilingual Shopify product copy and bilingual Facebook ad copy for the commemorative challenge coin shown in the uploaded images.",
    "- The first uploaded image is the edited FRONT product image.",
    "- The second uploaded image is the edited BACK product image.",
    "- Keep the tone premium, specific, and commercially usable.",
    "- Do not mention internal workflow, AI generation, or prompt engineering.",
    userInstruction?.trim()
      ? `Additional user instruction:\n${userInstruction.trim()}`
      : "Additional user instruction:\nNone.",
  ].join("\n");
}

async function postMarketingCopyCompletion({
  modelConfig,
  prompt,
  frontImageUrl,
  backImageUrl,
}: {
  modelConfig: Pick<ModelConfigRecord, "model" | "base_url"> & { apiKey: string };
  prompt: string;
  frontImageUrl: string;
  backImageUrl: string;
}) {
  return withRetry(async () => {
    const response = await fetch(`${getBaseUrl(modelConfig.base_url)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.model,
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: buildMarketingCopySystemPrompt() },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: frontImageUrl } },
              { type: "image_url", image_url: { url: backImageUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(MARKETING_COPY_TIMEOUT_MS),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`文案生成请求失败: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return payload.choices?.[0]?.message?.content ?? "";
  });
}

async function getDefaultTextModelConfig(supabase: SupabaseClient, userId: string) {
  const { data: defaultModel } = await supabase
    .from("model_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultModel) {
    return defaultModel as ModelConfigRecord;
  }

  const { data: latestModel } = await supabase
    .from("model_configs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestModel) {
    return latestModel as ModelConfigRecord;
  }

  throw new Error("未找到可用的文本模型配置。");
}

async function resolveSourceBundle(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
): Promise<ResolvedSourceBundle> {
  const { data: result, error: resultError } = await supabase
    .from("image_generation_results")
    .select("*")
    .eq("id", sourceImageId)
    .single();

  if (resultError || !result) {
    throw new Error("来源设计图不存在。");
  }

  const typedResult = result as ImageGenerationResultRecord;

  const { data: imageTask, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("*")
    .eq("id", typedResult.task_id)
    .eq("user_id", userId)
    .single();

  if (taskError || !imageTask) {
    throw new Error("来源设计图不存在。");
  }

  const typedTask = imageTask as ImageGenerationTaskRecord;

  const { data: extractionJob, error: extractionError } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("id", typedTask.extraction_job_id)
    .eq("user_id", userId)
    .single();

  if (extractionError || !extractionJob) {
    throw new Error("未找到来源主题文本。");
  }

  return {
    result: typedResult,
    imageTask: typedTask,
    extractionJob: extractionJob as ExtractionJobRecord,
  };
}

async function listSuccessfulEditJobsForSource(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
) {
  const { data: tasks, error: taskError } = await supabase
    .from("edit_tasks")
    .select("id, source_image_id")
    .eq("user_id", userId)
    .eq("source_image_id", sourceImageId);

  if (taskError) {
    throw taskError;
  }

  const taskIds = (tasks ?? []).map((task) => (task as { id: string }).id);

  if (taskIds.length === 0) {
    return [] as EditJobRecord[];
  }

  const { data: jobs, error: jobError } = await supabase
    .from("edit_jobs")
    .select("*")
    .in("task_id", taskIds)
    .eq("status", "success")
    .not("image_url", "is", null)
    .order("created_at", { ascending: false });

  if (jobError) {
    throw jobError;
  }

  return (jobs ?? []) as EditJobRecord[];
}

function getPromptPreview(extractionJob: ExtractionJobRecord) {
  const raw = (extractionJob.final_prompt || extractionJob.raw_input || "").trim();
  return raw.length > 140 ? `${raw.slice(0, 140)}...` : raw;
}

async function listVersionRecords(
  supabase: SupabaseClient,
  userId: string,
  filters?: {
    sourceImageId?: string;
    frontEditJobId?: string;
    backEditJobId?: string;
  },
) {
  let query = supabase
    .from("marketing_copy_versions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters?.sourceImageId) {
    query = query.eq("image_generation_result_id", filters.sourceImageId);
  }
  if (filters?.frontEditJobId) {
    query = query.eq("front_edit_job_id", filters.frontEditJobId);
  }
  if (filters?.backEditJobId) {
    query = query.eq("back_edit_job_id", filters.backEditJobId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as MarketingCopyVersionRecord[];
}

async function getTemplatesById(
  supabase: SupabaseClient,
  templateIds: string[],
) {
  if (templateIds.length === 0) {
    return new Map<string, MarketingCopyTemplateRecord>();
  }

  const { data, error } = await supabase
    .from("marketing_copy_templates")
    .select("*")
    .in("id", templateIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as MarketingCopyTemplateRecord[]).map((item) => [item.id, item]),
  );
}

async function getEditJobsById(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, EditJobRecord>();
  }

  const { data, error } = await supabase.from("edit_jobs").select("*").in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as EditJobRecord[]).map((item) => [item.id, item]));
}

async function getImageResultsById(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, ImageGenerationResultRecord>();
  }

  const { data, error } = await supabase.from("image_generation_results").select("*").in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as ImageGenerationResultRecord[]).map((item) => [item.id, item]));
}

async function resolveEditSelection(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
  frontEditJobId: string,
  backEditJobId: string,
): Promise<ResolvedEditSelection> {
  const jobs = await getEditJobsById(supabase, [frontEditJobId, backEditJobId]);
  const front = jobs.get(frontEditJobId);
  const back = jobs.get(backEditJobId);

  if (!front || !back) {
    throw new Error("所选编辑图片不存在。");
  }
  if (front.side !== "front" || back.side !== "back") {
    throw new Error("所选正反面图片不合法。");
  }
  if (front.status !== "success" || back.status !== "success" || !front.image_url || !back.image_url) {
    throw new Error("所选编辑图片尚未生成成功。");
  }

  const { data: tasks, error } = await supabase
    .from("edit_tasks")
    .select("*")
    .in("id", [front.task_id, back.task_id])
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const taskMap = new Map(((tasks ?? []) as Array<{ id: string; source_image_id: string }>).map((item) => [item.id, item]));
  const frontTask = taskMap.get(front.task_id);
  const backTask = taskMap.get(back.task_id);

  if (!frontTask || !backTask) {
    throw new Error("所选编辑图片不存在。");
  }
  if (frontTask.source_image_id !== sourceImageId || backTask.source_image_id !== sourceImageId) {
    throw new Error("所选编辑图片不属于当前设计图。");
  }

  return { front, back };
}

function toVersionListItem(
  version: MarketingCopyVersionRecord,
  templatesById: Map<string, MarketingCopyTemplateRecord>,
): MarketingCopyVersionListItem {
  const template = templatesById.get(version.marketing_copy_template_id);

  return {
    id: version.id,
    sourceImageId: version.image_generation_result_id,
    frontEditJobId: version.front_edit_job_id,
    backEditJobId: version.back_edit_job_id,
    templateId: version.marketing_copy_template_id,
    templateName: template?.name ?? "未知模板",
    createdAt: version.created_at,
    isConfirmed: version.is_confirmed,
    draftResult: normalizeMarketingCopyResult(version.draft_result_json),
    finalResult: version.final_result_json ? normalizeMarketingCopyResult(version.final_result_json) : null,
  };
}

async function buildVersionDetail(
  supabase: SupabaseClient,
  version: MarketingCopyVersionRecord,
): Promise<MarketingCopyVersionDetail> {
  const [templatesById, editJobsById, imageResultsById] = await Promise.all([
    getTemplatesById(supabase, [version.marketing_copy_template_id]),
    getEditJobsById(supabase, [version.front_edit_job_id, version.back_edit_job_id]),
    getImageResultsById(supabase, [version.image_generation_result_id]),
  ]);

  return {
    version: {
      ...version,
      draft_result_json: normalizeMarketingCopyResult(version.draft_result_json),
      final_result_json: version.final_result_json
        ? normalizeMarketingCopyResult(version.final_result_json)
        : null,
    },
    template: templatesById.get(version.marketing_copy_template_id) ?? null,
    sourceImageUrl: imageResultsById.get(version.image_generation_result_id)?.image_url ?? null,
    frontImageUrl: editJobsById.get(version.front_edit_job_id)?.image_url ?? null,
    backImageUrl: editJobsById.get(version.back_edit_job_id)?.image_url ?? null,
  };
}

export async function listMarketingCopyTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("marketing_copy_templates")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MarketingCopyTemplateRecord[];
}

export async function listEligibleMarketingCopySources(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 50;
  const { data: imageTasks, error: taskError } = await supabase
    .from("image_generation_tasks")
    .select("id, extraction_job_id, created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (taskError) {
    throw taskError;
  }

  const taskList = (imageTasks ?? []) as ImageGenerationTaskRecord[];
  if (taskList.length === 0) {
    return [] as MarketingCopySourceItem[];
  }

  const { data: results, error: resultError } = await supabase
    .from("image_generation_results")
    .select("id, task_id, image_url, created_at")
    .in("task_id", taskList.map((task) => task.id));

  if (resultError) {
    throw resultError;
  }

  const resultList = (results ?? []) as ImageGenerationResultRecord[];
  if (resultList.length === 0) {
    return [] as MarketingCopySourceItem[];
  }

  const { data: extractionJobs, error: extractionError } = await supabase
    .from("extraction_jobs")
    .select("id, raw_input, final_prompt")
    .in(
      "id",
      taskList.map((task) => task.extraction_job_id),
    );

  if (extractionError) {
    throw extractionError;
  }

  const extractionMap = new Map(
    ((extractionJobs ?? []) as ExtractionJobRecord[]).map((item) => [item.id, item]),
  );

  const { data: editTasks, error: editTaskError } = await supabase
    .from("edit_tasks")
    .select("id, source_image_id")
    .eq("user_id", userId)
    .in(
      "source_image_id",
      resultList.map((result) => result.id),
    );

  if (editTaskError) {
    throw editTaskError;
  }

  const editTaskList = editTasks ?? [];
  const taskIds = editTaskList.map((task) => (task as { id: string }).id);
  const jobsBySource = new Map<string, EditJobRecord[]>();

  if (taskIds.length > 0) {
    const { data: editJobs, error: editJobsError } = await supabase
      .from("edit_jobs")
      .select("id, task_id, side, image_url, created_at")
      .in("task_id", taskIds)
      .eq("status", "success")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });

    if (editJobsError) {
      throw editJobsError;
    }

    const taskToSource = new Map(
      editTaskList.map((task) => [(task as { id: string }).id, (task as { source_image_id: string }).source_image_id]),
    );

    ((editJobs ?? []) as EditJobRecord[]).forEach((job) => {
      const sourceId = taskToSource.get(job.task_id);
      if (!sourceId) return;
      const list = jobsBySource.get(sourceId) ?? [];
      list.push(job);
      jobsBySource.set(sourceId, list);
    });
  }

  const versions = await listVersionRecords(supabase, userId);
  const versionedSourceIds = new Set(versions.map((item) => item.image_generation_result_id));

  return resultList
    .map((result) => {
      const task = taskList.find((item) => item.id === result.task_id);
      const extraction = task ? extractionMap.get(task.extraction_job_id) : null;
      const jobs = jobsBySource.get(result.id) ?? [];
      const hasFront = jobs.some((job) => job.side === "front");
      const hasBack = jobs.some((job) => job.side === "back");
      if (!task || !extraction || !hasFront || !hasBack) {
        return null;
      }
      return {
        sourceImageId: result.id,
        imageGenerationTaskId: task.id,
        extractionJobId: extraction.id,
        sourceImageUrl: result.image_url,
        createdAt: result.created_at ?? task.created_at,
        promptPreview: getPromptPreview(extraction),
        hasHistory: versionedSourceIds.has(result.id),
      } satisfies MarketingCopySourceItem;
    })
    .filter((item): item is MarketingCopySourceItem => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMarketingCopySourceDetail(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
) {
  const [bundle, jobs] = await Promise.all([
    resolveSourceBundle(supabase, userId, sourceImageId),
    listSuccessfulEditJobsForSource(supabase, userId, sourceImageId),
  ]);
  const frontOptions = jobs
    .filter((job) => job.side === "front")
    .map((job) => ({
      id: job.id,
      taskId: job.task_id,
      side: job.side,
      imageUrl: job.image_url ?? "",
      createdAt: job.created_at,
      style: job.style,
    }));
  const backOptions = jobs
    .filter((job) => job.side === "back")
    .map((job) => ({
      id: job.id,
      taskId: job.task_id,
      side: job.side,
      imageUrl: job.image_url ?? "",
      createdAt: job.created_at,
      style: job.style,
    }));

  return {
    sourceImageId: bundle.result.id,
    imageGenerationTaskId: bundle.imageTask.id,
    extractionJobId: bundle.extractionJob.id,
    sourceImageUrl: bundle.result.image_url,
    createdAt: bundle.result.created_at ?? bundle.imageTask.created_at,
    promptPreview: getPromptPreview(bundle.extractionJob),
    rawInput: bundle.extractionJob.raw_input,
    frontOptions,
    backOptions,
    defaultFrontEditJobId: frontOptions[0]?.id ?? null,
    defaultBackEditJobId: backOptions[0]?.id ?? null,
  } satisfies MarketingCopySourceDetail;
}

export async function listMarketingCopyVersionsByCombo(
  supabase: SupabaseClient,
  userId: string,
  sourceImageId: string,
  frontEditJobId: string,
  backEditJobId: string,
) {
  const versions = await listVersionRecords(supabase, userId, {
    sourceImageId,
    frontEditJobId,
    backEditJobId,
  });
  const templatesById = await getTemplatesById(
    supabase,
    [...new Set(versions.map((item) => item.marketing_copy_template_id))],
  );

  return versions.map((item) => toVersionListItem(item, templatesById));
}

export async function generateMarketingCopyVersion(
  supabase: SupabaseClient,
  userId: string,
  input: {
    sourceImageId: string;
    frontEditJobId: string;
    backEditJobId: string;
    templateId: string;
    userInstruction?: string;
  },
) {
  const [bundle, selectedEdits, modelConfig, templates] = await Promise.all([
    resolveSourceBundle(supabase, userId, input.sourceImageId),
    resolveEditSelection(supabase, userId, input.sourceImageId, input.frontEditJobId, input.backEditJobId),
    getDefaultTextModelConfig(supabase, userId),
    getTemplatesById(supabase, [input.templateId]),
  ]);

  const template = templates.get(input.templateId);
  if (!template) {
    throw new Error("所选文案模板不存在。");
  }

  const rawOutput = await postMarketingCopyCompletion({
    modelConfig: {
      model: modelConfig.model,
      base_url: modelConfig.base_url,
      apiKey: decryptSecret(modelConfig.api_key_encrypted),
    },
    prompt: buildMarketingCopyUserPrompt({
      template,
      rawInput: bundle.extractionJob.raw_input,
      promptPreview: getPromptPreview(bundle.extractionJob),
      userInstruction: input.userInstruction,
    }),
    frontImageUrl: selectedEdits.front.image_url ?? "",
    backImageUrl: selectedEdits.back.image_url ?? "",
  });

  const normalized = normalizeMarketingCopyResult(parseModelJson(rawOutput));

  const { data, error } = await supabase
    .from("marketing_copy_versions")
    .insert({
      user_id: userId,
      extraction_job_id: bundle.extractionJob.id,
      image_generation_task_id: bundle.imageTask.id,
      image_generation_result_id: bundle.result.id,
      front_edit_job_id: selectedEdits.front.id,
      back_edit_job_id: selectedEdits.back.id,
      marketing_copy_template_id: template.id,
      model_config_id: modelConfig.id,
      user_instruction: input.userInstruction?.trim() || null,
      draft_result_json: normalized,
      final_result_json: null,
      is_confirmed: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("保存文案版本失败。");
  }

  return buildVersionDetail(supabase, data as MarketingCopyVersionRecord);
}

export async function getMarketingCopyVersionDetail(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data, error } = await supabase
    .from("marketing_copy_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw error ?? new Error("文案版本不存在。");
  }

  return buildVersionDetail(supabase, data as MarketingCopyVersionRecord);
}

export async function saveMarketingCopyFinal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  finalResult: MarketingCopyResult,
) {
  const normalized = normalizeMarketingCopyResult(finalResult);

  const { data, error } = await supabase
    .from("marketing_copy_versions")
    .update({ final_result_json: normalized })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("保存最终文案失败。");
  }

  return buildVersionDetail(supabase, data as MarketingCopyVersionRecord);
}

export async function confirmMarketingCopyVersion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { data: current, error: currentError } = await supabase
    .from("marketing_copy_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (currentError || !current) {
    throw currentError ?? new Error("文案版本不存在。");
  }

  const version = current as MarketingCopyVersionRecord;
  const finalResult = version.final_result_json
    ? normalizeMarketingCopyResult(version.final_result_json)
    : normalizeMarketingCopyResult(version.draft_result_json);

  await supabase
    .from("marketing_copy_versions")
    .update({ is_confirmed: false })
    .eq("user_id", userId)
    .eq("image_generation_result_id", version.image_generation_result_id)
    .eq("front_edit_job_id", version.front_edit_job_id)
    .eq("back_edit_job_id", version.back_edit_job_id)
    .eq("is_confirmed", true);

  const { data, error } = await supabase
    .from("marketing_copy_versions")
    .update({
      final_result_json: finalResult,
      is_confirmed: true,
    })
    .eq("id", version.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("确认文案版本失败。");
  }

  return buildVersionDetail(supabase, data as MarketingCopyVersionRecord);
}

export async function listMarketingCopyHistory(
  supabase: SupabaseClient,
  userId: string,
) {
  const versions = await listVersionRecords(supabase, userId);
  const templatesById = await getTemplatesById(
    supabase,
    [...new Set(versions.map((item) => item.marketing_copy_template_id))],
  );
  const editJobsById = await getEditJobsById(
    supabase,
    [
      ...new Set(
        versions.flatMap((item) => [item.front_edit_job_id, item.back_edit_job_id]),
      ),
    ],
  );
  const imageResultsById = await getImageResultsById(
    supabase,
    [...new Set(versions.map((item) => item.image_generation_result_id))],
  );

  return versions.map((version) => ({
    versionId: version.id,
    sourceImageId: version.image_generation_result_id,
    createdAt: version.created_at,
    templateName:
      templatesById.get(version.marketing_copy_template_id)?.name ?? "未知模板",
    isConfirmed: version.is_confirmed,
    sourceImageUrl: imageResultsById.get(version.image_generation_result_id)?.image_url ?? null,
    frontImageUrl: editJobsById.get(version.front_edit_job_id)?.image_url ?? null,
    backImageUrl: editJobsById.get(version.back_edit_job_id)?.image_url ?? null,
    draftResult: normalizeMarketingCopyResult(version.draft_result_json),
    finalResult: version.final_result_json
      ? normalizeMarketingCopyResult(version.final_result_json)
      : null,
  } satisfies MarketingCopyHistoryItem));
}
