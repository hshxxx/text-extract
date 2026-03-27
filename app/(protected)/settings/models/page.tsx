import { ModelSettingsClient } from "@/components/model-settings-client";
import { DEFAULT_IMAGE_MODEL_NAME, DEFAULT_TEXT_MODEL_NAME } from "@/utils/constants";

export default async function ModelSettingsPage() {
  const suggestedBaseUrl = process.env.OPENAI_COMPAT_BASE_URL?.replace(/\/chat\/completions$/, "") ?? "";

  return (
    <ModelSettingsClient
      initialTextModels={[]}
      initialImageModels={[]}
      suggestedBaseUrl={suggestedBaseUrl}
      suggestedTextModel={DEFAULT_TEXT_MODEL_NAME}
      suggestedImageModel={DEFAULT_IMAGE_MODEL_NAME}
    />
  );
}
