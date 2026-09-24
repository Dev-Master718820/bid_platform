"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResumePreview } from "@/components/resume/resume-preview";
import { pageBox } from "@/templates/geometry";
import { useBuilder, useResumeDocument } from "@/stores/resume-builder-store";

const ZOOMS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

export function PreviewPane() {
  const data = useResumeDocument();
  const format = useBuilder((s) => s.format);
  const setFormat = useBuilder((s) => s.setFormat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pages, setPages] = useState(1);
  const [fitted, setFitted] = useState(true);

  const fit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = pageBox(format.page_size, format.spacing.page_margin).widthPx;
    setZoom(Math.max(0.3, Math.min(1.5, (el.clientWidth - 64) / w)));
    setFitted(true);
  }, [format.page_size, format.spacing.page_margin]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (fitted) fit();
    const ro = new ResizeObserver(() => fitted && fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, fitted]);

  const step = (dir: 1 | -1) => {
    setFitted(false);
    setZoom((z) => (dir > 0 ? (ZOOMS.find((v) => v > z + 0.001) ?? z) : ([...ZOOMS].reverse().find((v) => v < z - 0.001) ?? z)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-background/80 flex h-11 shrink-0 items-center gap-1 border-b px-3 backdrop-blur">
        <div className="bg-muted flex rounded-md p-0.5 text-xs font-medium">
          {(["A4", "Letter"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setFormat({ page_size: p })} className={`rounded px-2 py-1 ${format.page_size === p ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground ml-2 text-xs tabular-nums">
          {pages} page{pages > 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Zoom out">
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Zoom in">
          <Plus />
        </Button>
        <Button variant={fitted ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" onClick={fit}>
          <Maximize2 className="size-3.5" /> Fit
        </Button>
      </div>
      <div ref={scrollRef} className="resume-canvas relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-w-fit justify-center p-8">
          <ResumePreview document={data} format={format} zoom={zoom} onPageCount={setPages} />
        </div>
      </div>
    </div>
  );
}
