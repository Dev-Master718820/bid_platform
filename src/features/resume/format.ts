import { z } from "zod";

/** Resume formatting settings — sent with every render/export request. */

export const TEMPLATE_KEYS = ["ats", "modern", "minimal", "executive", "developer", "aurora", "horizon", "prism", "luxe", "nova"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const LAYOUTS = ["single-column", "two-column", "sidebar"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const ALIGNMENTS = ["left", "center", "right"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const PAGE_SIZES = ["A4", "Letter"] as const;

/** Style options. "template" = keep the template's own choice. */
export const HEADING_ALIGNS = ["header", "left", "center", "right"] as const; // "header" = same as header alignment
export const BODY_ALIGNS = ["template", "left", "justify"] as const;
export const HEADING_CASES = ["template", "normal", "uppercase"] as const;
export const BULLETS = ["template", "disc", "circle", "square", "dash", "arrow", "check", "none"] as const;
export const SEPARATORS = ["template", "pipe", "bullet", "dot", "slash", "dash"] as const;
/** Job entry header: where the company, location and employment type go. */
export const ENTRY_LAYOUTS = ["inline", "stacked"] as const; // company on the role line / on its own line
export const ENTRY_LOCATIONS = ["left", "right", "hide"] as const; // location on line 2
export const ENTRY_TYPES = ["dot", "pipe", "paren", "split", "hide"] as const; // employment type next to location, or on the opposite side
export type EntryLayout = (typeof ENTRY_LAYOUTS)[number];
export type EntryLocation = (typeof ENTRY_LOCATIONS)[number];
export type EntryType = (typeof ENTRY_TYPES)[number];
export type BulletStyle = (typeof BULLETS)[number];
export type SeparatorStyle = (typeof SEPARATORS)[number];
export type PageSize = (typeof PAGE_SIZES)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color");

export const formatSettingsSchema = z.object({
  template: z.enum(TEMPLATE_KEYS).default("ats"),
  layout: z.enum(LAYOUTS).default("single-column"),
  /** Header alignment (name, title, contact line). */
  alignment: z.enum(ALIGNMENTS).default("left"),
  page_size: z.enum(PAGE_SIZES).default("A4"),
  font: z
    .object({
      family: z.string().max(60).default("Inter"),
      size: z.number().min(8).max(14).default(10.5),
      heading_size: z.number().min(10).max(32).default(20),
      letter_spacing: z.number().min(-0.05).max(0.2).default(0),
    })
    .default({}),
  spacing: z
    .object({
      line_height: z.number().min(1).max(2.2).default(1.4),
      section_spacing: z.number().min(4).max(40).default(14),
      page_margin: z.number().min(6).max(30).default(16), // millimetres
      /** Space between entries (jobs, schools, projects…), pt. */
      item_spacing: z.number().min(0).max(24).default(8),
    })
    .default({}),
  style: z
    .object({
      heading_align: z.enum(HEADING_ALIGNS).default("header"),
      body_align: z.enum(BODY_ALIGNS).default("template"),
      heading_case: z.enum(HEADING_CASES).default("template"),
      /** Section title size in pt; 0 = automatic (proportional to the body size). */
      heading_size: z.number().min(0).max(24).default(0),
      bullet: z.enum(BULLETS).default("template"),
      separator: z.enum(SEPARATORS).default("template"),
      /** Job header. Defaults reproduce "Role · Company / Location · Type". */
      entry_layout: z.enum(ENTRY_LAYOUTS).default("inline"),
      entry_location: z.enum(ENTRY_LOCATIONS).default("left"),
      entry_type: z.enum(ENTRY_TYPES).default("dot"),
    })
    .default({}),
  colors: z
    .object({
      header: hex.default("#111827"),
      accent: hex.default("#2563eb"),
      divider: hex.default("#d1d5db"),
      text: hex.default("#1f2937"),
    })
    .default({}),
});

export type FormatSettings = z.infer<typeof formatSettingsSchema>;
export type FormatSettingsInput = z.input<typeof formatSettingsSchema>;

export const DEFAULT_FORMAT: FormatSettings = formatSettingsSchema.parse({});

export function coerceFormat(input: unknown): FormatSettings {
  const res = formatSettingsSchema.safeParse(input ?? {});
  return res.success ? res.data : DEFAULT_FORMAT;
}

/** Deep-merge a partial (e.g. a template's default formatting) onto settings. */
export function mergeFormat(base: FormatSettings, patch: FormatSettingsInput | Record<string, unknown>): FormatSettings {
  const p = patch as Partial<FormatSettings>;
  return coerceFormat({
    ...base,
    ...p,
    font: { ...base.font, ...(p.font ?? {}) },
    spacing: { ...base.spacing, ...(p.spacing ?? {}) },
    colors: { ...base.colors, ...(p.colors ?? {}) },
    style: { ...base.style, ...(p.style ?? {}) },
  });
}
