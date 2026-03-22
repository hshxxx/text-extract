import type { ImageModelConfigInput, ImageModelConfigRecord, ImageSize } from "@/lib/types/domain";

export type GenerateImageArgs = {
  modelConfig: Pick<ImageModelConfigRecord, "model" | "base_url"> & { apiKey: string };
  prompt: string;
  size: ImageSize;
};

export type GeneratedImagePayload = {
  providerImageUrl: string | null;
  bytesBase64: string | null;
  contentType: string | null;
  seed?: string | null;
};

export interface ImageAdapter {
  testConnection(config: ImageModelConfigInput): Promise<void>;
  generateImage(args: GenerateImageArgs): Promise<GeneratedImagePayload>;
}
