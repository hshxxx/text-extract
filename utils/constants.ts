import type { StructuredData } from "@/lib/types/domain";
import { FIXED_SCHEMA_FIELDS } from "@/lib/types/domain";

export const APP_NAME = "AI Prompt Structurer";
export const MAX_INPUT_LENGTH = 4000;
export const EXTRACTION_TIMEOUT_MS = 30_000;
export const EXTRACTION_RETRY_DELAYS_MS = [1000, 2000, 4000];
export const EXTRACTION_RATE_LIMIT = 10;
export const IMAGE_GENERATION_RATE_LIMIT_PER_DAY = 20;
export const IMAGE_STORAGE_BUCKET = "generated-images";
export const IMAGE_GENERATION_TIMEOUT_MS = 60_000;
export const IMAGE_EDITING_TIMEOUT_MS = 120_000;
export const IMAGE_EDITING_RETRY_DELAYS_MS = [3000];
export const MARKETING_COPY_TIMEOUT_MS = 60_000;
export const MARKETING_COPY_RETRY_DELAYS_MS = [1000, 2000];
export const EDIT_TASK_STORAGE_PREFIX = "edit-tasks";
export const DEFAULT_TEMPLATE_NAME = "纪念币默认模板";
export const DEFAULT_TEMPLATE_CONTENT = `Design a commemorative challenge coin for "{theme_en}" ({theme_cn}).

Show both the obverse and reverse of the same coin in one image.

Obverse design:
- Main elements: {coin_front_element}
- Inscription engraved on the coin: {coin_front_text}

Reverse design:
- Main elements: {coin_back_element}
- Inscription engraved on the coin: {coin_back_text}

Style and finish:
- {style_requirements}
- realistic metal coin, embossed relief, collectible quality, clean studio lighting, detailed texture`;

export const EMPTY_STRUCTURED_DATA: StructuredData = FIXED_SCHEMA_FIELDS.reduce(
  (acc, field) => {
    acc[field] = "";
    return acc;
  },
  {} as StructuredData,
);

export const EXTRACTION_SYSTEM_PROMPT = `你是一个结构化信息提取器。请从用户输入中提取信息，并仅返回 JSON 对象。
必须包含以下字段，且每个字段值都必须是字符串：
- theme_cn
- theme_en
- coin_front_element
- coin_front_text
- coin_back_element
- coin_back_text
- style_requirements

如果某个字段无法确定，返回空字符串。不要输出 Markdown，不要输出额外说明。`;

export const DEFAULT_TEXT_MODEL_NAME = "gpt-5.4";
export const DEFAULT_IMAGE_MODEL_NAME = "gpt-image-1.5";
