"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Columns2, PanelLeft, RotateCcw, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { FONTS, getFont } from "@/templates/fonts";
import { DEFAULT_FORMAT, mergeFormat, type FormatSettings, type TemplateKey } from "@/features/resume/format";
import { useBuilder } from "@/stores/resume-builder-store";
import { TemplateThumb } from "@/components/resume/template-thumb";
import { SAMPLE_DOCUMENT } from "@/templates/sample-document";
import { cn } from "@/lib/utils";

export type TemplateOption = { key: TemplateKey; name: string; description: string; defaultFormatting: Record<string, unknown> };

const PALETTES: { name: string; colors: FormatSettings["colors"] }[] = [
  { name: "Ink", colors: { header: "#111827", accent: "#111827", divider: "#d1d5db", text: "#1f2937" } },
  { name: "Cobalt", colors: { header: "#0f172a", accent: "#2563eb", divider: "#dbeafe", text: "#1e293b" } },
  { name: "Emerald", colors: { header: "#052e2b", accent: "#059669", divider: "#d1fae5", text: "#1f2937" } },
  { name: "Navy", colors: { header: "#1e3a5f", accent: "#1e3a5f", divider: "#b8c4d6", text: "#1f2937" } },
  { name: "Burgundy", colors: { header: "#4c0519", accent: "#9f1239", divider: "#fecdd3", text: "#1f2937" } },
  { name: "Violet", colors: { header: "#2e1065", accent: "#7c3aed", divider: "#ede9fe", text: "#1f2937" } },
  { name: "Slate", colors: { header: "#334155", accent: "#64748b", divider: "#e2e8f0", text: "#334155" } },
  { name: "Amber", colors: { header: "#1c1917", accent: "#b45309", divider: "#fde68a", text: "#292524" } },
  // Two-tone palettes — the gradient templates blend Header → Accent.
  { name: "Sunset", colors: { header: "#db2777", accent: "#f97316", divider: "#fed7aa", text: "#1f2937" } },
  { name: "Ocean", colors: { header: "#1d4ed8", accent: "#06b6d4", divider: "#bae6fd", text: "#1e293b" } },
  { name: "Berry", colors: { header: "#6d28d9", accent: "#db2777", divider: "#f5d0fe", text: "#1f2937" } },
  { name: "Lagoon", colors: { header: "#0f766e", accent: "#84cc16", divider: "#d9f99d", text: "#1f2937" } },
];

/** One-click job header layouts (previews use sample text). */
const JOB_PRESETS: {
  name: string;
  style: { entry_layout: "inline" | "stacked"; entry_location: "left" | "right" | "hide"; entry_type: "dot" | "pipe" | "paren" | "split" | "hide" };
  line1Company: boolean;
  line2Left: string;
  line2Right: string;
}[] = [
  { name: "Classic", style: { entry_layout: "inline", entry_location: "left", entry_type: "dot" }, line1Company: true, line2Left: "Seattle, WA · Full Time", line2Right: "" },
  { name: "Type on the right", style: { entry_layout: "inline", entry_location: "left", entry_type: "split" }, line1Company: true, line2Left: "Seattle, WA", line2Right: "Full Time" },
  { name: "Company below, location right", style: { entry_layout: "stacked", entry_location: "right", entry_type: "hide" }, line1Company: false, line2Left: "Amazon", line2Right: "Seattle, WA" },
  { name: "Company below, type in brackets", style: { entry_layout: "stacked", entry_location: "right", entry_type: "paren" }, line1Company: false, line2Left: "Amazon", line2Right: "Seattle, WA (Full Time)" },
  { name: "Company below, type after bar", style: { entry_layout: "stacked", entry_location: "right", entry_type: "pipe" }, line1Company: false, line2Left: "Amazon", line2Right: "Seattle, WA | Full Time" },
];

function Group({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]; label: string }) {
  return (
    <div className="bg-muted grid rounded-md p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label || o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon && <o.icon className="size-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange, format }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <Label className="font-normal">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">{format ? format(value) : `${value}${unit ?? ""}`}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => v !== undefined && onChange(v)} />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label} color`} />
      </label>
      <span className="flex-1 text-sm">{label}</span>
      <HexInput value={value} onChange={onChange} />
    </div>
  );
}

/** Free-typing hex field: keeps a local draft and commits only valid colors. */
function HexInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toLowerCase());
      }}
      onBlur={() => setDraft(value)}
      className="h-8 w-24 font-mono text-xs uppercase"
      maxLength={7}
      aria-label="Hex color"
    />
  );
}

export function DesignPanel({ templates }: { templates: TemplateOption[] }) {
  const format = useBuilder((s) => s.format);
  const setFormat = useBuilder((s) => s.setFormat);
  const replaceFormat = useBuilder((s) => s.replaceFormat);

  /**
   * Apply a template's visual defaults, keeping the user's page setup. Switching templates also keeps
   * the template-independent style choices (alignment, bullets, separators…); "Reset style" clears them.
   */
  const applyTemplate = (t: TemplateOption, reset = false) => {
    const next = mergeFormat({ ...DEFAULT_FORMAT, template: t.key }, t.defaultFormatting);
    replaceFormat({
      ...next,
      page_size: format.page_size,
      spacing: { ...next.spacing, page_margin: format.spacing.page_margin, ...(reset ? {} : { item_spacing: format.spacing.item_spacing }) },
      ...(reset ? {} : { style: format.style }),
    });
  };
  const current = templates.find((t) => t.key === format.template);
  // Thumbnails use each template's own defaults (static → rendered once).
  const thumbFormats = useMemo(
    () => Object.fromEntries(templates.map((t) => [t.key, mergeFormat({ ...DEFAULT_FORMAT, template: t.key }, t.defaultFormatting)])) as Record<string, FormatSettings>,
    [templates],
  );

  return (
    <div className="grid gap-3">
      <Group
        title="Template"
        action={
          current && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => applyTemplate(current, true)}>
              <RotateCcw className="size-3" /> Reset style
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t)}
              aria-pressed={format.template === t.key}
              title={t.description}
              className={cn(
                "group overflow-hidden rounded-md border text-left transition-colors",
                format.template === t.key ? "border-brand bg-brand/5 ring-brand/30 ring-2" : "hover:bg-accent",
              )}
            >
              <div className="bg-muted/60 flex justify-center px-2 pt-2">
                <TemplateThumb document={SAMPLE_DOCUMENT} format={thumbFormats[t.key]!} width={180} />
              </div>
              <div className="border-t p-2">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-muted-foreground line-clamp-1 text-xs">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Page & layout">
        <div className="grid gap-1.5">
          <Label className="font-normal">Layout</Label>
          <Segmented
            label="Layout"
            value={format.layout}
            onChange={(layout) => setFormat({ layout })}
            options={[
              { value: "single-column", label: "Single", icon: Rows3 },
              { value: "two-column", label: "Two column", icon: Columns2 },
              { value: "sidebar", label: "Sidebar", icon: PanelLeft },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Page size</Label>
          <Segmented label="Page size" value={format.page_size} onChange={(page_size) => setFormat({ page_size })} options={[{ value: "A4", label: "A4" }, { value: "Letter", label: "Letter" }]} />
        </div>
        <SliderRow label="Page margin" value={format.spacing.page_margin} min={6} max={30} step={1} unit=" mm" onChange={(v) => setFormat({ spacing: { page_margin: v } })} />
      </Group>

      <Group title="Alignment">
        <div className="grid gap-1.5">
          <Label className="font-normal">Header — name, title &amp; contact</Label>
          <Segmented
            label="Header alignment"
            value={format.alignment}
            onChange={(alignment) => setFormat({ alignment })}
            options={[
              { value: "left", label: "Left", icon: AlignLeft },
              { value: "center", label: "Center", icon: AlignCenter },
              { value: "right", label: "Right", icon: AlignRight },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Section titles</Label>
          <Segmented
            label="Section title alignment"
            value={format.style.heading_align}
            onChange={(heading_align) => setFormat({ style: { heading_align } })}
            options={[
              { value: "header", label: "As header" },
              { value: "left", label: "", icon: AlignLeft },
              { value: "center", label: "", icon: AlignCenter },
              { value: "right", label: "", icon: AlignRight },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Body text — summary &amp; bullets</Label>
          <Segmented
            label="Body text alignment"
            value={format.style.body_align}
            onChange={(body_align) => setFormat({ style: { body_align } })}
            options={[
              { value: "template", label: "Template" },
              { value: "left", label: "Left", icon: AlignLeft },
              { value: "justify", label: "Justify", icon: AlignJustify },
            ]}
          />
        </div>
      </Group>

      <Group title="Job entries">
        <div className="grid gap-1.5">
          <Label className="font-normal">Presets</Label>
          <div className="grid gap-1.5">
            {JOB_PRESETS.map((p) => {
              const active = p.style.entry_layout === format.style.entry_layout && p.style.entry_location === format.style.entry_location && p.style.entry_type === format.style.entry_type;
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Job header preset: ${p.name}`}
                  onClick={() => setFormat({ style: p.style })}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-left text-[11px] leading-snug transition-colors",
                    active ? "border-brand bg-brand/5 ring-brand/30 ring-2" : "hover:bg-accent",
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <span>
                      <b>Software Engineer</b>
                      {p.line1Company && <span className="text-muted-foreground"> · Amazon</span>}
                    </span>
                    <span className="text-muted-foreground">Jan 2019 – Mar 2021</span>
                  </div>
                  <div className="text-muted-foreground flex justify-between gap-2">
                    <span>{p.line2Left}</span>
                    <span>{p.line2Right}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Company</Label>
          <Segmented
            label="Company placement"
            value={format.style.entry_layout}
            onChange={(entry_layout) => setFormat({ style: { entry_layout } })}
            options={[
              { value: "inline", label: "After role" },
              { value: "stacked", label: "Own line" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Location</Label>
          <Segmented
            label="Location placement"
            value={format.style.entry_location}
            onChange={(entry_location) => setFormat({ style: { entry_location } })}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
              { value: "hide", label: "Hide" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Employment type</Label>
          <Segmented
            label="Employment type"
            value={format.style.entry_type}
            onChange={(entry_type) => setFormat({ style: { entry_type } })}
            options={[
              { value: "dot", label: "· Type" },
              { value: "pipe", label: "| Type" },
              { value: "paren", label: "(Type)" },
              { value: "split", label: "Other side" },
              { value: "hide", label: "Hide" },
            ]}
          />
        </div>
      </Group>

      <Group title="Section titles & bullets">
        <div className="grid gap-1.5">
          <Label className="font-normal">Section title case</Label>
          <Segmented
            label="Section title case"
            value={format.style.heading_case}
            onChange={(heading_case) => setFormat({ style: { heading_case } })}
            options={[
              { value: "template", label: "Template" },
              { value: "normal", label: "Aa" },
              { value: "uppercase", label: "AA" },
            ]}
          />
        </div>
        <SliderRow
          label="Section title size"
          value={format.style.heading_size}
          min={0}
          max={20}
          step={0.5}
          format={(v) => (v === 0 ? "Auto" : `${v} pt`)}
          onChange={(v) => setFormat({ style: { heading_size: v === 0 ? 0 : Math.max(8, v) } })}
        />
        <div className="grid gap-1.5">
          <Label className="font-normal">Bullet style</Label>
          <Segmented
            label="Bullet style"
            value={format.style.bullet}
            onChange={(bullet) => setFormat({ style: { bullet } })}
            options={[
              { value: "template", label: "Auto" },
              { value: "disc", label: "•" },
              { value: "circle", label: "○" },
              { value: "square", label: "■" },
              { value: "dash", label: "–" },
              { value: "arrow", label: "›" },
              { value: "check", label: "✓" },
              { value: "none", label: "None" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="font-normal">Contact separator</Label>
          <Segmented
            label="Contact separator"
            value={format.style.separator}
            onChange={(separator) => setFormat({ style: { separator } })}
            options={[
              { value: "template", label: "Auto" },
              { value: "pipe", label: "|" },
              { value: "bullet", label: "•" },
              { value: "dot", label: "·" },
              { value: "slash", label: "/" },
              { value: "dash", label: "—" },
            ]}
          />
        </div>
      </Group>

      <Group title="Typography">
        <div className="grid gap-1.5">
          <Label className="font-normal">Font family</Label>
          <Select value={getFont(format.font.family).value} onValueChange={(family) => setFormat({ font: { family } })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["sans", "serif"] as const).map((cat) => (
                <div key={cat}>
                  <div className="text-muted-foreground px-2 py-1 text-xs">{cat === "sans" ? "Sans-serif" : "Serif"}</div>
                  {FONTS.filter((f) => f.category === cat).map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SliderRow label="Font size" value={format.font.size} min={8} max={14} step={0.5} unit=" pt" onChange={(v) => setFormat({ font: { size: v } })} />
        <SliderRow label="Name / heading size" value={format.font.heading_size} min={12} max={32} step={1} unit=" pt" onChange={(v) => setFormat({ font: { heading_size: v } })} />
        <SliderRow label="Line height" value={format.spacing.line_height} min={1} max={2} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => setFormat({ spacing: { line_height: v } })} />
        <SliderRow label="Letter spacing" value={format.font.letter_spacing} min={-0.03} max={0.1} step={0.005} format={(v) => `${v.toFixed(3)} em`} onChange={(v) => setFormat({ font: { letter_spacing: v } })} />
        <SliderRow label="Section spacing" value={format.spacing.section_spacing} min={4} max={40} step={1} unit=" pt" onChange={(v) => setFormat({ spacing: { section_spacing: v } })} />
        <SliderRow label="Space between entries" value={format.spacing.item_spacing} min={0} max={24} step={1} unit=" pt" onChange={(v) => setFormat({ spacing: { item_spacing: v } })} />
      </Group>

      <Group title="Colors">
        <div className="flex flex-wrap gap-1.5">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              onClick={() => setFormat({ colors: p.colors })}
              className="flex overflow-hidden rounded-md border shadow-xs transition-transform hover:scale-105"
            >
              <span className="size-5" style={{ background: p.colors.header }} />
              <span className="size-5" style={{ background: p.colors.accent }} />
              <span className="size-5" style={{ background: p.colors.divider }} />
            </button>
          ))}
        </div>
        <ColorRow label="Header" value={format.colors.header} onChange={(v) => setFormat({ colors: { header: v } })} />
        <ColorRow label="Accent" value={format.colors.accent} onChange={(v) => setFormat({ colors: { accent: v } })} />
        <ColorRow label="Divider" value={format.colors.divider} onChange={(v) => setFormat({ colors: { divider: v } })} />
        <ColorRow label="Body text" value={format.colors.text} onChange={(v) => setFormat({ colors: { text: v } })} />
      </Group>
    </div>
  );
}
