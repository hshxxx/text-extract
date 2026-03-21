import type { LLMAdapter, ExtractArgs } from "@/lib/services/llm/adapter";
import type { ModelConfigInput } from "@/lib/types/domain";

export class GeminiAdapter implements LLMAdapter {
  async testConnection(_config: ModelConfigInput) {
    throw new Error("Gemini 适配器尚未在首版开放。");
  }

  async extractStructuredData(_args: ExtractArgs): Promise<string> {
    throw new Error("Gemini 适配器尚未在首版开放。");
  }
}
