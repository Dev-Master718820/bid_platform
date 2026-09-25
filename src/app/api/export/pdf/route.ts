import { apiError, attachment, readExportRequest } from "@/lib/api";
import { renderResumeHtml } from "@/templates/html";
import { USES_MONO } from "@/templates/registry";
import { htmlToPdf } from "@/services/export/pdf";
import { embeddedFontCss } from "@/services/export/font-embed";
import { embedInPdf, makePayload } from "@/services/export/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { document, format, fileName, embed } → application/pdf (with editable data embedded unless embed=false). Stateless. */
export async function POST(req: Request) {
  try {
    const { document, format, fileName, embed } = await readExportRequest(req);
    const fontCss = await embeddedFontCss(format.font.family, USES_MONO.has(format.template));
    const html = await renderResumeHtml(document, format, { title: fileName, fontCss });
    const rendered = await htmlToPdf(html, { pageSize: format.page_size });
    const pdf = embed ? await embedInPdf(rendered, makePayload(document, format), fileName) : rendered;
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": attachment(fileName, "pdf"), "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
