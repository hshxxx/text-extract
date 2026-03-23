import sharp from "sharp";
import type { EditErrorCode } from "@/lib/types/domain";
import type { TrimResult } from "@/lib/image-editing/trim";

const MIN_SUBJECT_RATIO = 0.4;
const EDGE_THRESHOLD_RATIO = 0.03;

function getMarginThreshold(width: number, height: number) {
  return Math.ceil(Math.min(width, height) * EDGE_THRESHOLD_RATIO);
}

export async function padTrimmedSourceToSafeMargins(trimmed: TrimResult): Promise<TrimResult> {
  let padLeft = 0;
  let padRight = 0;
  let padTop = 0;
  let padBottom = 0;

  while (true) {
    const nextWidth = trimmed.canvasWidth + padLeft + padRight;
    const nextHeight = trimmed.canvasHeight + padTop + padBottom;
    const threshold = getMarginThreshold(nextWidth, nextHeight);
    const subjectLeft = trimmed.subjectBox.left + padLeft;
    const subjectTop = trimmed.subjectBox.top + padTop;
    const subjectRight = nextWidth - (subjectLeft + trimmed.subjectBox.width);
    const subjectBottom = nextHeight - (subjectTop + trimmed.subjectBox.height);

    const targetMargin = threshold + 1;
    const needLeft = Math.max(0, targetMargin - subjectLeft);
    const needRight = Math.max(0, targetMargin - subjectRight);
    const needTop = Math.max(0, targetMargin - subjectTop);
    const needBottom = Math.max(0, targetMargin - subjectBottom);

    if (needLeft === 0 && needRight === 0 && needTop === 0 && needBottom === 0) {
      break;
    }

    padLeft += needLeft;
    padRight += needRight;
    padTop += needTop;
    padBottom += needBottom;
  }

  if (padLeft === 0 && padRight === 0 && padTop === 0 && padBottom === 0) {
    return trimmed;
  }

  const buffer = await sharp(trimmed.buffer, { failOn: "none" })
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  return {
    ...trimmed,
    buffer,
    subjectBox: {
      ...trimmed.subjectBox,
      left: trimmed.subjectBox.left + padLeft,
      top: trimmed.subjectBox.top + padTop,
    },
    canvasWidth: trimmed.canvasWidth + padLeft + padRight,
    canvasHeight: trimmed.canvasHeight + padTop + padBottom,
  };
}

export function validateTrimmedSource(trimmed: TrimResult): EditErrorCode | null {
  const { subjectBox, originalWidth, originalHeight, canvasWidth, canvasHeight } = trimmed;

  if (subjectBox.width < 1 || subjectBox.height < 1) {
    return "TRIM_EMPTY";
  }

  const minOriginalSide = Math.min(originalWidth, originalHeight);
  const minSubjectSide = Math.min(subjectBox.width, subjectBox.height);

  if (minSubjectSide < minOriginalSide * MIN_SUBJECT_RATIO) {
    return "BOUNDING_BOX_TOO_SMALL";
  }

  const minHorizontalGap = Math.min(subjectBox.left, canvasWidth - (subjectBox.left + subjectBox.width));
  const minVerticalGap = Math.min(subjectBox.top, canvasHeight - (subjectBox.top + subjectBox.height));
  const threshold = getMarginThreshold(canvasWidth, canvasHeight);

  if (minHorizontalGap <= threshold || minVerticalGap <= threshold) {
    return "OBJECT_TOO_CLOSE_TO_EDGE";
  }

  return null;
}
