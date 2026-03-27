import { Suspense } from "react";
import { MarketingCopyClient } from "@/components/marketing-copy-client";
import { MarketingCopyPageClient } from "@/components/marketing-copy-page-client";

export default function MarketingCopyPage() {
  return (
    <Suspense
      fallback={<MarketingCopyClient initialSources={[]} initialTemplates={[]} initialSourceId={null} />}
    >
      <MarketingCopyPageClient />
    </Suspense>
  );
}
