import type { ImageAdapter, GenerateImageArgs, GeneratedImagePayload } from "@/lib/services/image-adapter/adapter";
import type { ImageModelConfigInput } from "@/lib/types/domain";
import { EXTRACTION_RETRY_DELAYS_MS, IMAGE_GENERATION_TIMEOUT_MS } from "@/utils/constants";

function getBaseUrl(baseUrl?: string) {
  const normalized = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");

  if (normalized.endsWith("/images/generations")) {
    return normalized.slice(0, -"/images/generations".length);
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

async function postImageGeneration({
  apiKey,
  baseUrl,
  payload,
}: {
  apiKey: string;
  baseUrl?: string;
  payload: Record<string, unknown>;
}) {
  return withRetry(async () => {
    const response = await fetch(`${getBaseUrl(baseUrl)}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`图片生成接口请求失败: ${response.status} ${details}`);
    }

    return response.json();
  });
}

function parseResponse(response: Record<string, unknown>): GeneratedImagePayload {
  const first = Array.isArray(response.data) ? response.data[0] : null;

  if (!first || typeof first !== "object") {
    throw new Error("图片生成接口未返回有效数据。");
  }

  const providerImageUrl = typeof first.url === "string" ? first.url : null;
  const bytesBase64 = typeof first.b64_json === "string" ? first.b64_json : null;

  if (!providerImageUrl && !bytesBase64) {
    throw new Error("图片生成接口未返回图片 URL 或 base64 数据。");
  }

  const rawSeed = (first as Record<string, unknown>).seed ?? response.seed;

  return {
    providerImageUrl,
    bytesBase64,
    contentType: bytesBase64 ? "image/png" : null,
    seed: typeof rawSeed === "string" || typeof rawSeed === "number" ? String(rawSeed) : null,
  };
}

export class OpenAIImageAdapter implements ImageAdapter {
  async testConnection(config: ImageModelConfigInput) {
    await postImageGeneration({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      payload: {
        model: config.model,
        prompt: "Minimal abstract test image, single circle on plain background.",
        size: "1024x1024",
        n: 1,
        response_format: "url",
      },
    });
  }

  async generateImage({ modelConfig, prompt, size }: GenerateImageArgs) {
    const response = await postImageGeneration({
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.base_url ?? undefined,
      payload: {
        model: modelConfig.model,
        prompt,
        size,
        n: 1,
        response_format: "url",
      },
    });

    return parseResponse(response as Record<string, unknown>);
  }
}
