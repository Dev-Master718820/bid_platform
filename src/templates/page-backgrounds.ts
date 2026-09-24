import type { FormatSettings, TemplateKey } from "@/features/resume/format";
import { PAGE_MM } from "@/templates/geometry";

/**
 * Full-page (edge-to-edge) backgrounds. Painted behind every page — in the live preview on each
 * page sheet, and in the PDF as a fixed layer that Chromium repeats on every printed page.
 * Values are CSS `background` shorthands computed from the resume's colors and page geometry.
 */

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Width (mm) from the page edge to the middle of the column gap — where a sidebar band should end. */
function sideBandMm(f: FormatSettings): number {
  const gapMm = (18 * 25.4) / 72; // .rf-cols column-gap: 18pt
  const content = PAGE_MM[f.page_size].width - f.spacing.page_margin * 2;
  // Must mirror the grid ratios in shared/frame.tsx (sidebar 0.5fr:1fr, two-column 1fr:0.52fr).
  const side = f.layout === "sidebar" ? ((content - gapMm) * 0.5) / 1.5 : ((content - gapMm) * 0.52) / 1.52;
  return f.spacing.page_margin + side + gapMm / 2;
}

const BACKGROUNDS: Partial<Record<TemplateKey, (f: FormatSettings) => string>> = {
  aurora: ({ colors: c }) =>
    [`radial-gradient(circle at 100% 0%, ${rgba(c.accent, 0.16)} 0%, transparent 42%)`, `radial-gradient(circle at 0% 100%, ${rgba(c.header, 0.1)} 0%, transparent 45%)`, "#ffffff"].join(", "),

  horizon: ({ colors: c }) => `linear-gradient(160deg, ${rgba(c.header, 0.13)} 0%, #ffffff 34%, #ffffff 66%, ${rgba(c.accent, 0.13)} 100%)`,

  prism: (f) => {
    const c = f.colors;
    if (f.layout === "single-column") return `linear-gradient(180deg, ${rgba(c.header, 0.08)} 0%, #ffffff 30%)`;
    const band = `${sideBandMm(f).toFixed(2)}mm`;
    const pos = f.layout === "sidebar" ? "left top" : "right top";
    return `linear-gradient(165deg, ${c.header} 0%, ${c.accent} 100%) ${pos} / ${band} 100% no-repeat, #ffffff`;
  },

  luxe: () => "linear-gradient(180deg, #fbf7ef 0%, #f7f0e3 100%)",

  nova: ({ colors: c }) =>
    [`radial-gradient(circle at 0% 0%, ${rgba(c.header, 0.14)} 0%, transparent 38%)`, `radial-gradient(circle at 100% 100%, ${rgba(c.accent, 0.14)} 0%, transparent 42%)`, "#ffffff"].join(", "),
};

export function pageBackground(format: FormatSettings): string | null {
  return BACKGROUNDS[format.template]?.(format) ?? null;
}
