import { AppShell } from "@/components/app-shell";
import { HistoryClient } from "@/components/history-client";
import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/services/history";
import { listImageHistory } from "@/lib/services/imageGeneration";

export default async function HistoryPage() {
  const { supabase, user } = await requireUser();
  const [items, imageItems] = await Promise.all([
    listHistory(supabase, user.id),
    listImageHistory(supabase, user.id),
  ]);

  return (
    <AppShell activePath="/history" userEmail={user.email}>
      <HistoryClient initialTextItems={items} initialImageItems={imageItems} />
    </AppShell>
  );
}
