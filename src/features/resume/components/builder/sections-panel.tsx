"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SECTION_TITLES, sectionHasContent, type SectionKey } from "@/features/resume/schema";
import { useBuilder, useResumeDocument } from "@/stores/resume-builder-store";
import { cn } from "@/lib/utils";

/** Section order, visibility and titles — written into the Resume JSON (created if empty). */
export function SectionsPanel() {
  const body = useResumeDocument().resume;
  const edit = useBuilder((s) => s.editResumeRaw);
  const resumeInvalid = useBuilder((s) => s.resumeErrors.length > 0);
  const promptOverrides = useBuilder((s) => {
    const o = s.mode === "tailor" ? s.tailored?.sections : undefined;
    const parts = [o?.order && "order", o?.hidden && "visibility", o?.titles && "titles"].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  });

  const move = (i: number, d: -1 | 1) =>
    edit((r) => {
      const order = [...body.section_order];
      const j = i + d;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j]!, order[i]!];
      r.section_order = order;
    });
  const toggle = (k: SectionKey) =>
    edit((r) => {
      r.hidden_sections = body.hidden_sections.includes(k) ? body.hidden_sections.filter((x) => x !== k) : [...body.hidden_sections, k];
    });
  const rename = (k: SectionKey, title: string) =>
    edit((r) => {
      const titles = { ...body.section_titles };
      if (title.trim() && title.trim() !== DEFAULT_SECTION_TITLES[k]) titles[k] = title.trim();
      else delete titles[k];
      r.section_titles = titles;
    });

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        Reorder, rename or hide sections. In two-column and sidebar layouts, Summary, Experience and Projects go in the main column. Changes are saved into your Resume JSON.
      </p>
      {resumeInvalid && <p className="bg-destructive/10 text-destructive rounded-md p-2 text-xs">Fix the Resume JSON errors first.</p>}
      {promptOverrides && (
        <p className="bg-brand/10 rounded-md p-2 text-xs">
          Tailor mode: your tailoring prompt set the section {promptOverrides}. Those settings come from the prompt — edit the prompt to change them.
        </p>
      )}
      <ul className="bg-card divide-y rounded-lg border">
        {body.section_order.map((k, i) => {
          const hidden = body.hidden_sections.includes(k);
          const empty = !sectionHasContent(body, k);
          return (
            <li key={k} className={cn("flex items-center gap-2 p-2", hidden && "opacity-60")}>
              <div className="flex flex-col">
                <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0 || resumeInvalid} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === body.section_order.length - 1 || resumeInvalid}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <Input
                key={`${k}-${body.section_titles[k] ?? ""}`}
                defaultValue={body.section_titles[k] ?? DEFAULT_SECTION_TITLES[k]}
                onBlur={(e) => e.target.value !== (body.section_titles[k] ?? DEFAULT_SECTION_TITLES[k]) && rename(k, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                disabled={resumeInvalid}
                className="h-8 flex-1"
                aria-label={`${DEFAULT_SECTION_TITLES[k]} title`}
              />
              {empty && <span className="text-muted-foreground text-xs whitespace-nowrap">empty</span>}
              <Button variant="ghost" size="icon-sm" disabled={resumeInvalid} onClick={() => toggle(k)} aria-label={hidden ? "Show section" : "Hide section"}>
                {hidden ? <EyeOff /> : <Eye />}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
