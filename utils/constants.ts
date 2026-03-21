import type { StructuredData } from "@/lib/types/domain";
import { FIXED_SCHEMA_FIELDS } from "@/lib/types/domain";

export const APP_NAME = "AI Prompt Structurer";
export const MAX_INPUT_LENGTH = 4000;
export const EXTRACTION_TIMEOUT_MS = 30_000;
export const EXTRACTION_RETRY_DELAYS_MS = [1000, 2000, 4000];
export const EXTRACTION_RATE_LIMIT = 10;
export const DEFAULT_TEMPLATE_NAME = "纪念币默认模板";
export const DEFAULT_TEMPLATE_CONTENT = `请基于以下结构化信息，生成一段适合纪念币设计的标准 Prompt：

主题（中文）：{theme_cn}
主题（英文）：{theme_en}
正面元素：{coin_front_element}
正面文案：{coin_front_text}
背面元素：{coin_back_element}
背面文案：{coin_back_text}
风格要求：{style_requirements}`;

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
