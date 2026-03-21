import type { LLMAdapter } from "@/lib/services/llm/adapter";
import { AnthropicAdapter } from "@/lib/services/llm/anthropic";
import { GeminiAdapter } from "@/lib/services/llm/gemini";
import { OpenAIAdapter } from "@/lib/services/llm/openai";
import type { Provider } from "@/lib/types/domain";

export function getLlmAdapter(provider: Provider): LLMAdapter {
  switch (provider) {
    case "openai":
      return new OpenAIAdapter();
    case "anthropic":
      return new AnthropicAdapter();
    case "gemini":
      return new GeminiAdapter();
    default:
      throw new Error("不支持的 Provider。");
  }
}
