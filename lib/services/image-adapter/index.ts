import type { ImageAdapter } from "@/lib/services/image-adapter/adapter";
import { OpenAIImageAdapter } from "@/lib/services/image-adapter/openai";
import type { ImageProvider } from "@/lib/types/domain";

export function getImageAdapter(provider: ImageProvider): ImageAdapter {
  switch (provider) {
    case "openai":
      return new OpenAIImageAdapter();
    default:
      throw new Error("不支持的图片 Provider。");
  }
}
