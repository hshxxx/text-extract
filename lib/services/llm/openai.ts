import type { LLMAdapter, ExtractArgs } from "@/lib/services/llm/adapter";
import type { ModelConfigInput } from "@/lib/types/domain";
import { EXTRACTION_RETRY_DELAYS_MS, EXTRACTION_SYSTEM_PROMPT, EXTRACTION_TIMEOUT_MS } from "@/utils/constants";

function getBaseUrl(baseUrl?: string) {
  const normalized = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized.slice(0, -"/chat/completions".length);
  }
  return normalized;
}

async function withRetry<T>(runner: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= EXTRACTION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await runner();
    } catch (error) {
      lastError = error;
      if (attempt === EXTRACTION_RETRY_DELAYS_MS.length) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, EXTRACTION_RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
}

async function postChatCompletion({
  apiKey,
  baseUrl,
  payload,
}: {
  apiKey: string;
  baseUrl?: string;
  payload: Record<string, unknown>;
}) {
  return withRetry(async () => {
    const response = await fetch(`${getBaseUrl(baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI 兼容接口请求失败: ${response.status} ${details}`);
    }

    return response.json();
  });
}

export class OpenAIAdapter implements LLMAdapter {
  async testConnection(config: ModelConfigInput) {
    await postChatCompletion({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      payload: {
        model: config.model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: 'Return a JSON object exactly like {"status":"ok"}.' }],
        temperature: 0,
        max_tokens: 5,
      },
    });
  }

  async extractStructuredData({ modelConfig, rawInput }: ExtractArgs) {
    const response = await postChatCompletion({
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.base_url ?? undefined,
      payload: {
        model: modelConfig.model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: rawInput },
        ],
      },
    });

    return response.choices?.[0]?.message?.content ?? "";
  }
}
