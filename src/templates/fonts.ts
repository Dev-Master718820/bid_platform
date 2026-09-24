/**
 * Font registry shared by preview, PDF (headless Chromium) and DOCX.
 * Proprietary fonts (Arial, Calibri, Times, Georgia) render with metric-compatible open web fonts
 * (Arimo, Carlito, Tinos, Gelasio). The web font is listed FIRST: otherwise fontconfig on Linux
 * "satisfies" e.g. Georgia with an unrelated local substitute, and preview/PDF line breaks diverge.
 * DOCX files still reference the real font names.
 */
export type FontOption = {
  value: string;
  label: string;
  category: "sans" | "serif";
  /** CSS font-family stack */
  css: string;
  /** Google Fonts family + axis spec (css2 API) */
  google: string;
  /** Font name written into the .docx */
  docx: string;
};

const FULL = "ital,wght@0,400;0,500;0,600;0,700;1,400";
const BASIC = "ital,wght@0,400;0,700;1,400";

export const FONTS: FontOption[] = [
  { value: "Inter", label: "Inter", category: "sans", css: "'Inter', Arial, sans-serif", google: `Inter:${FULL}`, docx: "Inter" },
  { value: "Arial", label: "Arial", category: "sans", css: "'Arimo', Arial, Helvetica, sans-serif", google: `Arimo:${FULL}`, docx: "Arial" },
  { value: "Calibri", label: "Calibri", category: "sans", css: "'Carlito', Calibri, sans-serif", google: `Carlito:${BASIC}`, docx: "Calibri" },
  { value: "Roboto", label: "Roboto", category: "sans", css: "'Roboto', Arial, sans-serif", google: `Roboto:${FULL}`, docx: "Roboto" },
  { value: "Open Sans", label: "Open Sans", category: "sans", css: "'Open Sans', Arial, sans-serif", google: `Open+Sans:${FULL}`, docx: "Open Sans" },
  { value: "Lato", label: "Lato", category: "sans", css: "'Lato', Arial, sans-serif", google: `Lato:${BASIC}`, docx: "Lato" },
  { value: "Source Sans 3", label: "Source Sans", category: "sans", css: "'Source Sans 3', Arial, sans-serif", google: `Source+Sans+3:${FULL}`, docx: "Source Sans 3" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans", category: "sans", css: "'IBM Plex Sans', Arial, sans-serif", google: `IBM+Plex+Sans:${FULL}`, docx: "IBM Plex Sans" },
  { value: "Georgia", label: "Georgia", category: "serif", css: "'Gelasio', Georgia, serif", google: `Gelasio:${FULL}`, docx: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman", category: "serif", css: "'Tinos', 'Times New Roman', Times, serif", google: `Tinos:${BASIC}`, docx: "Times New Roman" },
  { value: "Garamond", label: "Garamond", category: "serif", css: "'EB Garamond', Garamond, serif", google: `EB+Garamond:${FULL}`, docx: "Garamond" },
  { value: "Merriweather", label: "Merriweather", category: "serif", css: "'Merriweather', Georgia, serif", google: `Merriweather:${BASIC}`, docx: "Merriweather" },
  { value: "Lora", label: "Lora", category: "serif", css: "'Lora', Georgia, serif", google: `Lora:${FULL}`, docx: "Lora" },
  { value: "Playfair Display", label: "Playfair Display", category: "serif", css: "'Playfair Display', Georgia, serif", google: `Playfair+Display:${FULL}`, docx: "Playfair Display" },
];

export const MONO_CSS = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";
const MONO_GOOGLE = "JetBrains+Mono:wght@400;500;600";

export function getFont(value: string): FontOption {
  return FONTS.find((f) => f.value === value) ?? FONTS[0]!;
}

/**
 * Same-origin stylesheet for the browser preview. It serves the exact static font files the PDF
 * embeds, so preview and PDF share glyph metrics (see services/export/font-embed.ts).
 */
export function previewFontCssUrl(value: string, withMono = false): string {
  return `/api/fonts/css?family=${encodeURIComponent(getFont(value).value)}${withMono ? "&mono=1" : ""}`;
}

/** Google Fonts stylesheet URL for a family (+ mono for templates that use it). Server-side use. */
export function fontStylesheetUrl(value: string, withMono = false): string {
  const families = [getFont(value).google, ...(withMono ? [MONO_GOOGLE] : [])];
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}
