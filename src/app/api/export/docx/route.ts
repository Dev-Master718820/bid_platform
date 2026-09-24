import { apiError, attachment, readExportRequest } from "@/lib/api";
import { buildDocx } from "@/services/export/docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { document, format, fileName } → .docx. Stateless: nothing is stored. */
export async function POST(req: Request) {
  try {
    const { document, format, fileName } = await readExportRequest(req);
    const buffer = await buildDocx(document, format);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": attachment(fileName, "docx"),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
