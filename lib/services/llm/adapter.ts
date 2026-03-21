import type { ModelConfigInput, ModelConfigRecord } from "@/lib/types/domain";

export type ExtractArgs = {
  modelConfig: Pick<ModelConfigRecord, "model" | "base_url"> & { apiKey: string };
  rawInput: string;
};

export interface LLMAdapter {
  testConnection(config: ModelConfigInput): Promise<void>;
  extractStructuredData(args: ExtractArgs): Promise<string>;
}
