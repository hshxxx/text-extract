import { AppShell } from "@/components/app-shell";
import { ExtractWorkspace } from "@/components/extract-workspace";
import { requireUser } from "@/lib/auth";
import { listModelConfigs } from "@/lib/services/models";
import { listTemplates } from "@/lib/services/templates";

export default async function ExtractPage() {
  const { supabase, user } = await requireUser();
  const [models, templates] = await Promise.all([
    listModelConfigs(supabase, user.id),
    listTemplates(supabase, user.id),
  ]);

  const safeModels = models.map(({ api_key_encrypted: _secret, ...rest }) => rest);

  return (
    <AppShell activePath="/extract" userEmail={user.email}>
      <ExtractWorkspace models={safeModels} templates={templates} />
    </AppShell>
  );
}
