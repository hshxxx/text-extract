import { IMAGE_EDITING_RETRY_DELAYS_MS, IMAGE_EDITING_TIMEOUT_MS } from "@/utils/constants";
import type { EditSide, EditStyleKey, ImageModelConfigRecord } from "@/lib/types/domain";
import { buildEditImagePrompt } from "@/lib/image-editing/styles";

type ImageEditErrorCode = "PHOTOROOM_REQUEST_FAILED" | "PHOTOROOM_TIMEOUT" | "PHOTOROOM_INVALID_RESPONSE";

type ImageEditError = Error & {
  code: ImageEditErrorCode;
  detail?: string;
};

type EditImageArgs = {
  image: Buffer;
  side: EditSide;
  style: EditStyleKey;
  modelConfig: Pick<ImageModelConfigRecord, "model" | "base_url"> & { apiKey: string };
};

function createImageEditError(code: ImageEditErrorCode, detail?: string): ImageEditError {
  const error = new Error(code) as ImageEditError;
  error.code = code;
  error.detail = detail;
  return error;
}

function getBaseUrl(baseUrl?: string) {
  const normalized = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");

  if (normalized.endsWith("/images/edits")) {
    return normalized.slice(0, -"/images/edits".length);
  }

  return normalized;
}

function shouldRetryImageEdit(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const typedError = error as ImageEditError;

  if (typedError.code === "PHOTOROOM_TIMEOUT" || typedError.code === "PHOTOROOM_INVALID_RESPONSE") {
    return false;
  }

  if (typedError.code !== "PHOTOROOM_REQUEST_FAILED") {
    return false;
  }

  const statusMatch = typedError.detail ? typedError.detail.match(/^(\d{3})\b/) : null;

  if (!statusMatch) {
    return true;
  }

  const status = Number(statusMatch[1]);
  return status === 429 || status >= 500;
}

async function withRetry<T>(runner: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= IMAGE_EDITING_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await runner();
    } catch (error) {
      lastError = error;

      if (attempt === IMAGE_EDITING_RETRY_DELAYS_MS.length || !shouldRetryImageEdit(error)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, IMAGE_EDITING_RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
}

function parseResponse(response: Record<string, unknown>) {
  const first = Array.isArray(response.data) ? response.data[0] : null;

  if (!first || typeof first !== "object") {
    throw createImageEditError("PHOTOROOM_INVALID_RESPONSE", "图片编辑接口未返回有效数据。");
  }

  const providerImageUrl = typeof first.url === "string" ? first.url : null;
  const bytesBase64 = typeof first.b64_json === "string" ? first.b64_json : null;

  if (!providerImageUrl && !bytesBase64) {
    throw createImageEditError("PHOTOROOM_INVALID_RESPONSE", "图片编辑接口未返回图片 URL 或 base64 数据。");
  }

  return {
    providerImageUrl,
    bytesBase64,
    contentType: bytesBase64 ? "image/png" : "image/png",
  };
}

async function downloadProviderImage(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(IMAGE_EDITING_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw createImageEditError("PHOTOROOM_REQUEST_FAILED", `下载编辑图片失败: ${response.status}`);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "image/png",
    providerImageUrl: url,
  };
}

async function postImageEdit({
  apiKey,
  baseUrl,
  form,
}: {
  apiKey: string;
  baseUrl?: string | null;
  form: FormData;
}) {
  return withRetry(async () => {
    let response: Response;

    try {
      response = await fetch(`${getBaseUrl(baseUrl ?? undefined)}/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(IMAGE_EDITING_TIMEOUT_MS),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError" || /timed out/i.test(error.message))
      ) {
        throw createImageEditError("PHOTOROOM_TIMEOUT", `超过 ${Math.round(IMAGE_EDITING_TIMEOUT_MS / 1000)} 秒未收到响应。`);
      }

      throw createImageEditError(
        "PHOTOROOM_REQUEST_FAILED",
        error instanceof Error ? error.message : "Network request failed",
      );
    }

    if (!response.ok) {
      const details = await response.text();
      throw createImageEditError("PHOTOROOM_REQUEST_FAILED", `${response.status} ${details}`);
    }

    return response.json();
  });
}

export async function generateEditedCoinImage(args: EditImageArgs) {
  const form = new FormData();
  const imageBytes = new Uint8Array(args.image);

  form.append("image[]", new Blob([imageBytes], { type: "image/png" }), `${args.side}-source.png`);
  form.set("model", args.modelConfig.model);
  form.set("prompt", buildEditImagePrompt(args.style, args.side));
  form.set("size", "1024x1024");
  form.set("response_format", "b64_json");

  const response = await postImageEdit({
    apiKey: args.modelConfig.apiKey,
    baseUrl: args.modelConfig.base_url,
    form,
  });

  const parsed = parseResponse(response as Record<string, unknown>);

  if (parsed.bytesBase64) {
    return {
      bytes: Buffer.from(parsed.bytesBase64, "base64"),
      contentType: parsed.contentType,
      providerImageUrl: parsed.providerImageUrl,
    };
  }

  if (parsed.providerImageUrl) {
    return downloadProviderImage(parsed.providerImageUrl);
  }

  throw createImageEditError("PHOTOROOM_INVALID_RESPONSE", "图片编辑接口未返回可保存的图片数据。");
}
