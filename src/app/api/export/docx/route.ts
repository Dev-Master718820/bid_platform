import { apiError, attachment, readExportRequest } from "@/lib/api";
import { buildDocx } from "@/services/export/docx";
import { embedInDocx, makePayload } from "@/services/export/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { document, format, fileName, embed } → .docx (with editable data embedded unless embed=false). Stateless. */
export async function POST(req: Request) {
  try {
    const { document, format, fileName, embed } = await readExportRequest(req);
    const built = await buildDocx(document, format);
    const buffer = embed ? await embedInDocx(built, makePayload(document, format)) : built;
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
