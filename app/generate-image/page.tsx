import { AppShell } from "@/components/app-shell";
import { ImageGenerationClient } from "@/components/image-generation-client";
import { requireUser } from "@/lib/auth";
import { listExtractionResultsForImage } from "@/lib/services/extractionResults";
import { listImageModelConfigs } from "@/lib/services/imageModels";

export default async function GenerateImagePage() {
  const { supabase, user } = await requireUser();
  const [prompts, imageModels] = await Promise.all([
    listExtractionResultsForImage(supabase, user.id),
    listImageModelConfigs(supabase, user.id),
  ]);
  const safeImageModels = imageModels.map(({ api_key_encrypted: _secret, ...rest }) => rest);

  return (
    <AppShell activePath="/generate-image" userEmail={user.email}>
      <ImageGenerationClient initialPrompts={prompts} initialImageModels={safeImageModels} />
    </AppShell>
  );
}
