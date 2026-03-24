import { AppShell } from "@/components/app-shell";
import { HistoryClient } from "@/components/history-client";
import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/services/history";
import { listEditHistory } from "@/lib/services/imageEditing";
import { listImageHistory } from "@/lib/services/imageGeneration";
import { listMarketingCopyHistory } from "@/lib/services/marketingCopy";

export default async function HistoryPage() {
  const { supabase, user } = await requireUser();
  const [items, imageItems, editItems, marketingItems] = await Promise.all([
    listHistory(supabase, user.id),
    listImageHistory(supabase, user.id),
    listEditHistory(supabase, user.id),
    listMarketingCopyHistory(supabase, user.id),
  ]);

  return (
    <AppShell activePath="/history" userEmail={user.email}>
      <HistoryClient
        initialTextItems={items}
        initialImageItems={imageItems}
        initialEditItems={editItems}
        initialMarketingItems={marketingItems}
      />
    </AppShell>
  );
}
