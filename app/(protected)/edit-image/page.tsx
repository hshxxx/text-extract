import { Suspense } from "react";
import { EditImageClient } from "@/components/edit-image-client";
import { EditImagePageClient } from "@/components/edit-image-page-client";

export default function EditImagePage() {
  return (
    <Suspense fallback={<EditImageClient initialSources={[]} initialSourceId={null} />}>
      <EditImagePageClient />
    </Suspense>
  );
}
