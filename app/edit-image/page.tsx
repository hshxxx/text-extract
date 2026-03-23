import { AppShell } from "@/components/app-shell";
import { EditImageClient } from "@/components/edit-image-client";
import { requireUser } from "@/lib/auth";
import { listEditableImagesForEditing } from "@/lib/services/imageEditing";

export default async function EditImagePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { source } = await searchParams;
  const sources = await listEditableImagesForEditing(supabase, user.id);

  return (
    <AppShell activePath="/edit-image" userEmail={user.email}>
      <EditImageClient initialSources={sources} initialSourceId={source ?? null} />
    </AppShell>
  );
}
