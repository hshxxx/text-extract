import sharp from "sharp";

export type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TrimResult = {
  buffer: Buffer;
  boundingBox: BoundingBox;
  subjectBox: BoundingBox;
  originalWidth: number;
  originalHeight: number;
  canvasWidth: number;
  canvasHeight: number;
};

function isWhite(r: number, g: number, b: number) {
  return r > 245 && g > 245 && b > 245;
}

export async function trimWhiteBorder(input: Buffer): Promise<TrimResult> {
  const source = sharp(input, { failOn: "none" });
  const metadata = await source.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < 1 || height < 1) {
    throw new Error("TRIM_EMPTY");
  }

  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      if (!isWhite(r, g, b)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("TRIM_EMPTY");
  }

  const detectedWidth = maxX - minX + 1;
  const detectedHeight = maxY - minY + 1;
  const paddingX = Math.max(1, Math.round(detectedWidth * 0.05));
  const paddingY = Math.max(1, Math.round(detectedHeight * 0.05));
  const left = Math.max(0, minX - paddingX);
  const top = Math.max(0, minY - paddingY);
  const right = Math.min(width - 1, maxX + paddingX);
  const bottom = Math.min(height - 1, maxY + paddingY);
  const boundingBox = {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
  const subjectBox = {
    left: minX - left,
    top: minY - top,
    width: detectedWidth,
    height: detectedHeight,
  };

  const buffer = await sharp(input, { failOn: "none" }).extract(boundingBox).png().toBuffer();

  return {
    buffer,
    boundingBox,
    subjectBox,
    originalWidth: width,
    originalHeight: height,
    canvasWidth: boundingBox.width,
    canvasHeight: boundingBox.height,
  };
}
