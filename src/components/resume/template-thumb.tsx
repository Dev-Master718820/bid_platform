"use client";

import { memo } from "react";
import type { ResumeDocument } from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { ResumeRenderer } from "@/templates/renderer";
import { pageBox } from "@/templates/geometry";
import { pageBackground } from "@/templates/page-backgrounds";
import { USES_MONO } from "@/templates/registry";
import { useResumeFonts } from "./use-resume-fonts";

/**
 * Miniature of a template's first page (top portion), rendered with the real template at full size
 * and scaled down — including the template's page background.
 */
export const TemplateThumb = memo(function TemplateThumb({
  document,
  format,
  width = 200,
  cropRatio = 0.62,
}: {
  document: ResumeDocument;
  format: FormatSettings;
  width?: number;
  /** Fraction of the page height to show. */
  cropRatio?: number;
}) {
  useResumeFonts(format.font.family, USES_MONO.has(format.template));
  const box = pageBox(format.page_size, format.spacing.page_margin);
  const scale = width / box.widthPx;
  return (
    <div className="relative overflow-hidden rounded-sm bg-white ring-1 ring-black/10" style={{ width, height: box.heightPx * scale * cropRatio }} aria-hidden>
      <div
        style={{
          width: box.widthPx,
          height: box.heightPx,
          padding: box.marginPx,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          background: pageBackground(format) ?? "#fff",
        }}
      >
        <ResumeRenderer document={document} format={format} />
      </div>
    </div>
  );
});
