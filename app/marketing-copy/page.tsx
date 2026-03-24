import { AppShell } from "@/components/app-shell";
import { MarketingCopyClient } from "@/components/marketing-copy-client";
import { requireUser } from "@/lib/auth";

export default async function MarketingCopyPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { source } = await searchParams;

  return (
    <AppShell activePath="/marketing-copy" userEmail={user.email}>
      <MarketingCopyClient
        initialSources={[]}
        initialTemplates={[]}
        initialSourceId={source ?? null}
      />
    </AppShell>
  );
}
