export const FIXED_SCHEMA_FIELDS = [
  "theme_cn",
  "theme_en",
  "coin_front_element",
  "coin_front_text",
  "coin_back_element",
  "coin_back_text",
  "style_requirements",
] as const;

export type StructuredField = (typeof FIXED_SCHEMA_FIELDS)[number];

export type StructuredData = Record<StructuredField, string>;

export type Provider = "openai" | "anthropic" | "gemini";

export type ImageProvider = "openai";
export type ImageSize = "1024x1024" | "1536x1536" | "2048x2048" | "2560x1440" | "3840x2160";

export type ModelConfigRecord = {
  id: string;
  user_id: string;
  name: string;
  provider: Provider;
  model: string;
  base_url: string | null;
  api_key_encrypted: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ModelConfigInput = {
  name: string;
  provider: Provider;
  model: string;
  baseUrl?: string;
  apiKey: string;
  isDefault?: boolean;
};

export type TemplateRecord = {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  is_seeded: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplateInput = {
  name: string;
  content: string;
  isDefault?: boolean;
};

export type JobStatus = "processing" | "success" | "failed";

export type ExtractionJobRecord = {
  id: string;
  user_id: string;
  model_config_id: string | null;
  template_id: string | null;
  status: JobStatus;
  raw_input: string;
  template_snapshot: string;
  raw_model_output: string | null;
  structured_data: StructuredData | null;
  final_prompt: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ExtractionRequest = {
  rawInput: string;
  modelConfigId: string;
  templateId: string;
};

export type ExtractionResponse = {
  jobId: string;
  status: JobStatus;
  structuredData: StructuredData | null;
  finalPrompt: string | null;
  rawModelOutput?: string | null;
  errorMessage?: string | null;
};

export type ExtractionResultListItem = {
  id: string;
  prompt: string;
  created_at: string;
};

export type ImageModelConfigRecord = {
  id: string;
  user_id: string;
  name: string;
  provider: ImageProvider;
  model: string;
  base_url: string | null;
  api_key_encrypted: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ImageModelConfigInput = {
  name: string;
  provider: ImageProvider;
  model: string;
  baseUrl?: string;
  apiKey: string;
  isDefault?: boolean;
};

export type ImageGenerationStatus = "processing" | "success" | "failed";
export type EditTaskStatus =
  | "splitting"
  | "trimming"
  | "validating"
  | "editing_front"
  | "editing_back"
  | "uploading"
  | "partial_success"
  | "completed"
  | "failed";
export type EditJobStatus = "processing" | "success" | "failed";
export type EditSide = "front" | "back";
export type EditStyleKey =
  | "luxury_wood"
  | "premium_giftbox"
  | "dark_luxury_stage"
  | "soft_studio_light"
  | "elegant_pedestal"
  | "premium_velvet";
export type EditErrorCode =
  | "SPLIT_FAILED"
  | "TRIM_EMPTY"
  | "BOUNDING_BOX_TOO_SMALL"
  | "OBJECT_TOO_CLOSE_TO_EDGE"
  | "SOURCE_NOT_FOUND"
  | "PHOTOROOM_REQUEST_FAILED"
  | "PHOTOROOM_TIMEOUT"
  | "PHOTOROOM_INVALID_RESPONSE"
  | "IMAGE_EDIT_REQUEST_FAILED"
  | "IMAGE_EDIT_TIMEOUT"
  | "IMAGE_EDIT_INVALID_RESPONSE"
  | "UPLOAD_FAILED"
  | "DB_WRITE_FAILED";

export type ImageGenerationTaskRecord = {
  id: string;
  user_id: string;
  extraction_job_id: string;
  image_model_config_id: string | null;
  image_size: ImageSize;
  status: ImageGenerationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ImageGenerationResultRecord = {
  id: string;
  task_id: string;
  storage_path: string;
  image_url: string;
  provider_image_url: string | null;
  model: string;
  seed: string | null;
  created_at: string;
};

export type EditTaskRecord = {
  id: string;
  user_id: string;
  source_image_id: string;
  status: EditTaskStatus;
  created_at: string;
  updated_at: string;
};

export type EditJobRecord = {
  id: string;
  task_id: string;
  side: EditSide;
  style: EditStyleKey;
  status: EditJobStatus;
  error_code: EditErrorCode | null;
  error_message: string | null;
  source_storage_path: string | null;
  provider_raw_storage_path: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ImageGenerationRequest = {
  extractionResultId: string;
  imageModelConfigId: string;
  imageSize: ImageSize;
};

export type CreateEditTaskRequest = {
  source_image_id: string;
};

export type CreateEditTaskResponse = {
  task_id: string;
  status: EditTaskStatus;
  front_job_id: string | null;
  back_job_id: string | null;
  front_status: EditJobStatus | null;
  back_status: EditJobStatus | null;
  front_image: string | null;
  back_image: string | null;
  error_code?: EditErrorCode | null;
  error_message?: string | null;
};

export type RetryEditJobResponse = {
  task_id: string;
  new_job_id: string;
  status: EditTaskStatus;
  front_job_id: string | null;
  back_job_id: string | null;
  front_status: EditJobStatus | null;
  back_status: EditJobStatus | null;
  front_image: string | null;
  back_image: string | null;
  error_code?: EditErrorCode | null;
  error_message?: string | null;
};

export type ImageGenerationResponse = {
  taskId: string;
  imageResultId: string | null;
  status: ImageGenerationStatus;
  imageUrl: string | null;
  sourcePrompt: string;
  extractionJobId: string;
  imageSize: ImageSize;
  modelName: string;
  errorMessage?: string | null;
  seed?: string | null;
};

export type ImageHistoryItem = {
  taskId: string;
  extractionJobId: string;
  prompt: string;
  promptPreview: string;
  imageSize: ImageSize;
  status: ImageGenerationStatus;
  createdAt: string;
  modelName: string;
  imageUrl: string | null;
  errorMessage: string | null;
};

export type ImageHistoryDetail = {
  task: ImageGenerationTaskRecord;
  result: ImageGenerationResultRecord | null;
  sourcePrompt: string;
  modelName: string;
};

export type EditableImageListItem = {
  id: string;
  taskId: string;
  imageUrl: string;
  createdAt: string;
  edited: boolean;
  latestEditTaskId: string | null;
  latestEditStatus: EditTaskStatus | null;
};

export type EditHistoryItem = {
  taskId: string;
  sourceImageId: string;
  createdAt: string;
  status: EditTaskStatus;
  frontStatus: EditJobStatus | null;
  backStatus: EditJobStatus | null;
  frontImage: string | null;
  backImage: string | null;
};

export type EditHistoryDetail = {
  task: EditTaskRecord;
  sourceImageId: string;
  sourceImageUrl: string | null;
  frontJob: EditJobRecord | null;
  backJob: EditJobRecord | null;
};

export type EditTaskDetailResponse = {
  task_id: string;
  task_status: EditTaskStatus;
  front_job_id: string | null;
  back_job_id: string | null;
  front_status: EditJobStatus | null;
  back_status: EditJobStatus | null;
  front_image: string | null;
  back_image: string | null;
  error_code?: EditErrorCode | null;
  error_message?: string | null;
};

export type MarketingCopyTemplateRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  prompt_guidance: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
};

export type MarketingCopyLocalizedText = {
  en: string;
  cn: string;
};

export type MarketingCopyResult = {
  shopify: {
    title: MarketingCopyLocalizedText;
    subtitle: MarketingCopyLocalizedText;
    selling_points: MarketingCopyLocalizedText[];
    description: MarketingCopyLocalizedText;
  };
  facebook: {
    primary_text: MarketingCopyLocalizedText;
    headline: MarketingCopyLocalizedText;
    description: MarketingCopyLocalizedText;
    cta_suggestion: MarketingCopyLocalizedText;
  };
};

export type MarketingCopyVersionRecord = {
  id: string;
  user_id: string;
  extraction_job_id: string;
  image_generation_task_id: string;
  image_generation_result_id: string;
  front_edit_job_id: string;
  back_edit_job_id: string;
  marketing_copy_template_id: string;
  model_config_id: string | null;
  user_instruction: string | null;
  draft_result_json: MarketingCopyResult;
  final_result_json: MarketingCopyResult | null;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingCopySourceItem = {
  sourceImageId: string;
  imageGenerationTaskId: string;
  extractionJobId: string;
  sourceImageUrl: string;
  createdAt: string;
  promptPreview: string;
  hasHistory: boolean;
};

export type MarketingCopyEditOption = {
  id: string;
  taskId: string;
  side: EditSide;
  imageUrl: string;
  createdAt: string;
  style: EditStyleKey;
};

export type MarketingCopySourceDetail = {
  sourceImageId: string;
  imageGenerationTaskId: string;
  extractionJobId: string;
  sourceImageUrl: string;
  createdAt: string;
  promptPreview: string;
  rawInput: string;
  frontOptions: MarketingCopyEditOption[];
  backOptions: MarketingCopyEditOption[];
  defaultFrontEditJobId: string | null;
  defaultBackEditJobId: string | null;
};

export type MarketingCopyVersionListItem = {
  id: string;
  sourceImageId: string;
  frontEditJobId: string;
  backEditJobId: string;
  templateId: string;
  templateName: string;
  createdAt: string;
  isConfirmed: boolean;
  draftResult: MarketingCopyResult;
  finalResult: MarketingCopyResult | null;
};

export type MarketingCopyVersionDetail = {
  version: MarketingCopyVersionRecord;
  template: MarketingCopyTemplateRecord | null;
  sourceImageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
};

export type GenerateMarketingCopyRequest = {
  sourceImageId: string;
  frontEditJobId: string;
  backEditJobId: string;
  templateId: string;
  userInstruction?: string;
};

export type SaveMarketingCopyFinalRequest = {
  finalResult: MarketingCopyResult;
};

export type MarketingCopyHistoryItem = {
  versionId: string;
  sourceImageId: string;
  createdAt: string;
  templateName: string;
  isConfirmed: boolean;
  sourceImageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  draftResult: MarketingCopyResult;
  finalResult: MarketingCopyResult | null;
};
