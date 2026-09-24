"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ResumeDocument } from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { ResumeRenderer } from "@/templates/renderer";
import { pageBox } from "@/templates/geometry";
import { layoutPages, type Slice } from "@/templates/paginate";
import { USES_MONO } from "@/templates/registry";
import { pageBackground } from "@/templates/page-backgrounds";
import { useResumeFonts } from "./use-resume-fonts";

const Rendered = memo(function Rendered({ document, format }: { document: ResumeDocument; format: FormatSettings }) {
  return <ResumeRenderer document={document} format={format} />;
});

/**
 * Live paginated preview.
 * 1. Render the resume once, off-screen, at the page's content width.
 * 2. Measure [data-block] elements and compute page breaks (same rules as print CSS).
 * 3. Render each page as a clipped window onto the content.
 */
export function ResumePreview({
  document,
  format,
  zoom,
  onPageCount,
  showPageNumbers = true,
}: {
  document: ResumeDocument;
  format: FormatSettings;
  zoom: number;
  onPageCount?: (n: number) => void;
  showPageNumbers?: boolean;
}) {
  const box = pageBox(format.page_size, format.spacing.page_margin);
  const pageBg = pageBackground(format);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Slice[][]>([[]]);
  const fontsKey = useResumeFonts(format.font.family, USES_MONO.has(format.template));

  const recompute = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const next = layoutPages(el, box.contentHeightPx);
    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [box.contentHeightPx]);

  useLayoutEffect(recompute, [recompute, document, format, fontsKey]);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  useEffect(() => onPageCount?.(pages.length), [pages.length, onPageCount]);

  const content = useMemo(() => <Rendered document={document} format={format} />, [document, format]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Off-screen measurement copy */}
      <div aria-hidden style={{ position: "absolute", left: -100000, top: 0, width: box.contentWidthPx, visibility: "hidden", pointerEvents: "none" }}>
        <div ref={measureRef}>{content}</div>
      </div>

      {pages.map((slices, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div style={{ width: box.widthPx * zoom, height: box.heightPx * zoom }} className="shrink-0">
            <div
              className="bg-white shadow-[0_1px_3px_rgba(0,0,0,.12),0_8px_24px_-6px_rgba(0,0,0,.18)]"
              style={{
                width: box.widthPx,
                height: box.heightPx,
                padding: box.marginPx,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                // Same full-bleed background the PDF repeats on every page.
                ...(pageBg && { background: pageBg }),
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                {slices.map((s, j) => (
                  <div
                    key={j}
                    style={{
                      position: "absolute",
                      top: s.dest,
                      left: 0,
                      width: "100%",
                      height: s.to - s.from,
                      overflow: "hidden",
                      clipPath: `inset(0 ${box.contentWidthPx - s.x1}px 0 ${s.x0}px)`,
                    }}
                  >
                    <div style={{ transform: `translateY(${-s.from}px)` }}>{content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {showPageNumbers && (
            <div className="text-muted-foreground text-xs tabular-nums">
              Page {i + 1} of {pages.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
