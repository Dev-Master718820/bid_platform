import type { PageSize } from "@/features/resume/format";

/** Page geometry in millimetres; CSS px at 96 dpi. */
export const PAGE_MM: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

export const MM_TO_PX = 96 / 25.4;
export const mmToPx = (mm: number) => mm * MM_TO_PX;
/** 1pt = 1/72in; 1 twip = 1/20pt (DOCX). */
export const ptToHalfPt = (pt: number) => Math.round(pt * 2);
export const ptToTwip = (pt: number) => Math.round(pt * 20);
export const mmToTwip = (mm: number) => Math.round((mm / 25.4) * 1440);

export function pageBox(size: PageSize, marginMm: number) {
  const page = PAGE_MM[size];
  return {
    widthPx: mmToPx(page.width),
    heightPx: mmToPx(page.height),
    marginPx: mmToPx(marginMm),
    contentWidthPx: mmToPx(page.width - marginMm * 2),
    contentHeightPx: mmToPx(page.height - marginMm * 2),
  };
}
