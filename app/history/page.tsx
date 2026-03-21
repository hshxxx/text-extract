import { AppShell } from "@/components/app-shell";
import { HistoryClient } from "@/components/history-client";
import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/services/history";

export default async function HistoryPage() {
  const { supabase, user } = await requireUser();
  const items = await listHistory(supabase, user.id);

  return (
    <AppShell activePath="/history" userEmail={user.email}>
      <HistoryClient initialItems={items} />
    </AppShell>
  );
}
