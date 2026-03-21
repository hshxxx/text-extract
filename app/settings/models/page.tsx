import { AppShell } from "@/components/app-shell";
import { ModelSettingsClient } from "@/components/model-settings-client";
import { requireUser } from "@/lib/auth";
import { listModelConfigs } from "@/lib/services/models";

export default async function ModelSettingsPage() {
  const { supabase, user } = await requireUser();
  const models = await listModelConfigs(supabase, user.id);
  const safeModels = models.map(({ api_key_encrypted: _secret, ...rest }) => rest);
  const suggestedBaseUrl = process.env.OPENAI_COMPAT_BASE_URL?.replace(/\/chat\/completions$/, "") ?? "";
  const suggestedModel = "gpt-5.4";

  return (
    <AppShell activePath="/settings/models" userEmail={user.email}>
      <ModelSettingsClient
        initialItems={safeModels}
        suggestedBaseUrl={suggestedBaseUrl}
        suggestedModel={suggestedModel}
      />
    </AppShell>
  );
}
