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
