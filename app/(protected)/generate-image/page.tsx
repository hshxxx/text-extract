import { ImageGenerationClient } from "@/components/image-generation-client";

export default async function GenerateImagePage() {
  return <ImageGenerationClient initialPrompts={[]} initialImageModels={[]} />;
}
