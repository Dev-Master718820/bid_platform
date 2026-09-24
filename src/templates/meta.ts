import type { FormatSettingsInput, TemplateKey } from "@/features/resume/format";

/** Code-level template metadata. Admins can override name/description/defaults via ResumeTemplate rows. */
export const TEMPLATE_META: Record<
  TemplateKey,
  { name: string; description: string; category: string; defaultFormatting: FormatSettingsInput }
> = {
  ats: {
    name: "ATS Professional",
    description: "Plain, single-column structure that parses cleanly in applicant tracking systems.",
    category: "professional",
    defaultFormatting: {
      layout: "single-column",
      alignment: "center",
      font: { family: "Arial", size: 10.5, heading_size: 20 },
      colors: { header: "#000000", accent: "#000000", divider: "#000000", text: "#111111" },
    },
  },
  modern: {
    name: "Modern",
    description: "Bold accent color, clean typography and skill chips for a contemporary look.",
    category: "creative",
    defaultFormatting: {
      layout: "sidebar",
      alignment: "left",
      font: { family: "Inter", size: 10, heading_size: 24 },
      colors: { header: "#0f172a", accent: "#2563eb", divider: "#e2e8f0", text: "#1e293b" },
    },
  },
  minimal: {
    name: "Minimal",
    description: "Generous whitespace and quiet typography. Lets your content speak.",
    category: "simple",
    defaultFormatting: {
      layout: "single-column",
      alignment: "left",
      font: { family: "Source Sans 3", size: 10.5, heading_size: 26, letter_spacing: 0.005 },
      spacing: { line_height: 1.5, section_spacing: 18 },
      colors: { header: "#111111", accent: "#6b7280", divider: "#e5e7eb", text: "#262626" },
    },
  },
  executive: {
    name: "Executive",
    description: "Serif typography and a strong header band for senior and leadership roles.",
    category: "professional",
    defaultFormatting: {
      layout: "single-column",
      alignment: "center",
      font: { family: "Georgia", size: 10.5, heading_size: 24 },
      colors: { header: "#1e3a5f", accent: "#1e3a5f", divider: "#b8c4d6", text: "#1f2937" },
    },
  },
  developer: {
    name: "Software Engineer",
    description: "Tech-forward layout with a skills matrix, project focus and monospace accents.",
    category: "technical",
    defaultFormatting: {
      layout: "two-column",
      alignment: "left",
      font: { family: "IBM Plex Sans", size: 9.5, heading_size: 22 },
      colors: { header: "#0b1220", accent: "#059669", divider: "#d1d5db", text: "#1f2937" },
    },
  },
  aurora: {
    name: "Aurora",
    description: "Gradient header card, soft corner glow and gradient section rules.",
    category: "gradient",
    defaultFormatting: {
      layout: "single-column",
      alignment: "left",
      font: { family: "Inter", size: 10, heading_size: 26 },
      colors: { header: "#4338ca", accent: "#06b6d4", divider: "#c7d2fe", text: "#1e293b" },
    },
  },
  horizon: {
    name: "Horizon",
    description: "Full-page soft gradient wash with gradient name and headings.",
    category: "gradient",
    defaultFormatting: {
      layout: "single-column",
      alignment: "left",
      font: { family: "Lato", size: 10.5, heading_size: 28 },
      spacing: { line_height: 1.45, section_spacing: 16 },
      colors: { header: "#1d4ed8", accent: "#9333ea", divider: "#ddd6fe", text: "#1f2937" },
    },
  },
  prism: {
    name: "Prism",
    description: "Full-height gradient sidebar with white text for contact, skills and education.",
    category: "gradient",
    defaultFormatting: {
      layout: "sidebar",
      alignment: "left",
      font: { family: "Open Sans", size: 9.5, heading_size: 26 },
      colors: { header: "#6d28d9", accent: "#db2777", divider: "#ede9fe", text: "#1f2937" },
    },
  },
  luxe: {
    name: "Luxe",
    description: "Elegant serif on warm cream, with gold gradient hairlines.",
    category: "gradient",
    defaultFormatting: {
      layout: "single-column",
      alignment: "center",
      font: { family: "Lora", size: 10.5, heading_size: 26, letter_spacing: 0.005 },
      spacing: { line_height: 1.45, section_spacing: 16 },
      colors: { header: "#1c1917", accent: "#a16207", divider: "#d6c7a1", text: "#292524" },
    },
  },
  nova: {
    name: "Nova",
    description: "Vivid gradient name and section markers over pastel corner gradients.",
    category: "gradient",
    defaultFormatting: {
      layout: "two-column",
      alignment: "left",
      font: { family: "Roboto", size: 9.5, heading_size: 30 },
      colors: { header: "#7c3aed", accent: "#f97316", divider: "#fde2e4", text: "#1f2937" },
    },
  },
};
