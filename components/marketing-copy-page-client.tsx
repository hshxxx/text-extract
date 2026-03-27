"use client";

import { useSearchParams } from "next/navigation";
import { MarketingCopyClient } from "@/components/marketing-copy-client";

export function MarketingCopyPageClient() {
  const searchParams = useSearchParams();

  return (
    <MarketingCopyClient
      initialSources={[]}
      initialTemplates={[]}
      initialSourceId={searchParams.get("source")}
    />
  );
}
