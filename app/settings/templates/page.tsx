import { AppShell } from "@/components/app-shell";
import { TemplateSettingsClient } from "@/components/template-settings-client";
import { requireUser } from "@/lib/auth";
import { listTemplates } from "@/lib/services/templates";

export default async function TemplateSettingsPage() {
  const { supabase, user } = await requireUser();
  const templates = await listTemplates(supabase, user.id);

  return (
    <AppShell activePath="/settings/templates" userEmail={user.email}>
      <TemplateSettingsClient initialItems={templates} />
    </AppShell>
  );
}
