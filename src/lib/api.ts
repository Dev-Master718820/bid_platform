import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resumeDocumentSchema } from "@/features/resume/schema";
import { formatSettingsSchema } from "@/features/resume/format";

const MAX_BODY_BYTES = 1_000_000;

export const exportRequestSchema = z.object({
  document: resumeDocumentSchema,
  format: formatSettingsSchema,
  fileName: z.string().trim().max(100).default("resume"),
  /** Embed the (visible) resume data + formatting so the file can be reopened and edited. */
  embed: z.boolean().default(true),
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Reads and validates an export request body (size-limited). */
export async function readExportRequest(req: Request): Promise<ExportRequest> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError("Request too large", 413);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError("Body must be JSON", 400);
  }
  const parsed = exportRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
  }
  return parsed.data;
}

export function apiError(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[api]", e);
  return NextResponse.json({ error: "Could not generate the file. Please try again." }, { status: 500 });
}

/** Safe ASCII filename + RFC 5987 UTF-8 variant for Content-Disposition. */
export function attachment(name: string, ext: string) {
  const base = name.trim() || "resume";
  const ascii = base.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_").slice(0, 80) || "resume";
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(base)}.${ext}`;
}
