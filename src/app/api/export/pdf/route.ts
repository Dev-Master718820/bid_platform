import { apiError, attachment, readExportRequest } from "@/lib/api";
import { renderResumeHtml } from "@/templates/html";
import { USES_MONO } from "@/templates/registry";
import { htmlToPdf } from "@/services/export/pdf";
import { embeddedFontCss } from "@/services/export/font-embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { document, format, fileName } → application/pdf. Stateless: nothing is stored. */
export async function POST(req: Request) {
  try {
    const { document, format, fileName } = await readExportRequest(req);
    const fontCss = await embeddedFontCss(format.font.family, USES_MONO.has(format.template));
    const html = await renderResumeHtml(document, format, { title: fileName, fontCss });
    const pdf = await htmlToPdf(html, { pageSize: format.page_size });
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": attachment(fileName, "pdf"), "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
