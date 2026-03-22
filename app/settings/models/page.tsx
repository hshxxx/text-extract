import { AppShell } from "@/components/app-shell";
import { ModelSettingsClient } from "@/components/model-settings-client";
import { requireUser } from "@/lib/auth";
import { listImageModelConfigs } from "@/lib/services/imageModels";
import { listModelConfigs } from "@/lib/services/models";
import { DEFAULT_IMAGE_MODEL_NAME, DEFAULT_TEXT_MODEL_NAME } from "@/utils/constants";

export default async function ModelSettingsPage() {
  const { supabase, user } = await requireUser();
  const [models, imageModels] = await Promise.all([
    listModelConfigs(supabase, user.id),
    listImageModelConfigs(supabase, user.id),
  ]);
  const safeTextModels = models.map(({ api_key_encrypted: _secret, ...rest }) => rest);
  const safeImageModels = imageModels.map(({ api_key_encrypted: _secret, ...rest }) => rest);
  const suggestedBaseUrl = process.env.OPENAI_COMPAT_BASE_URL?.replace(/\/chat\/completions$/, "") ?? "";

  return (
    <AppShell activePath="/settings/models" userEmail={user.email}>
      <ModelSettingsClient
        initialTextModels={safeTextModels}
        initialImageModels={safeImageModels}
        suggestedBaseUrl={suggestedBaseUrl}
        suggestedTextModel={DEFAULT_TEXT_MODEL_NAME}
        suggestedImageModel={DEFAULT_IMAGE_MODEL_NAME}
      />
    </AppShell>
  );
}
