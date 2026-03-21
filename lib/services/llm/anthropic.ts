import type { LLMAdapter, ExtractArgs } from "@/lib/services/llm/adapter";
import type { ModelConfigInput } from "@/lib/types/domain";

export class AnthropicAdapter implements LLMAdapter {
  async testConnection(_config: ModelConfigInput) {
    throw new Error("Anthropic 适配器尚未在首版开放。");
  }

  async extractStructuredData(_args: ExtractArgs): Promise<string> {
    throw new Error("Anthropic 适配器尚未在首版开放。");
  }
}
