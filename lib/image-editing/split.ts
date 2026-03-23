import sharp from "sharp";

export type SplitImageResult = {
  frontBuffer: Buffer;
  backBuffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  halfWidth: number;
  halfHeight: number;
};

export async function splitCombinedCoinImage(input: Buffer): Promise<SplitImageResult> {
  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < 2 || height < 2) {
    throw new Error("SPLIT_FAILED");
  }

  const halfWidth = Math.floor(width / 2);

  if (halfWidth < 1 || width - halfWidth < 1) {
    throw new Error("SPLIT_FAILED");
  }

  const [frontBuffer, backBuffer] = await Promise.all([
    sharp(input, { failOn: "none" })
      .extract({ left: 0, top: 0, width: halfWidth, height })
      .png()
      .toBuffer(),
    sharp(input, { failOn: "none" })
      .extract({ left: halfWidth, top: 0, width: width - halfWidth, height })
      .png()
      .toBuffer(),
  ]);

  return {
    frontBuffer,
    backBuffer,
    originalWidth: width,
    originalHeight: height,
    halfWidth,
    halfHeight: height,
  };
}
