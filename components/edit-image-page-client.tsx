"use client";

import { useSearchParams } from "next/navigation";
import { EditImageClient } from "@/components/edit-image-client";

export function EditImagePageClient() {
  const searchParams = useSearchParams();

  return <EditImageClient initialSources={[]} initialSourceId={searchParams.get("source")} />;
}
