import type { ResumeDocument } from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { TEMPLATE_COMPONENTS } from "@/templates/registry";

/**
 * Resume Renderer — the single entry point of the rendering engine.
 * Resume JSON + FormatSettings → template component → HTML.
 * Pure and side-effect free: used by the client preview and by server-side HTML/PDF export.
 */
export function ResumeRenderer({ document, format }: { document: ResumeDocument; format: FormatSettings }) {
  const Template = TEMPLATE_COMPONENTS[format.template] ?? TEMPLATE_COMPONENTS.ats;
  return <Template data={document.resume} format={format} />;
}
