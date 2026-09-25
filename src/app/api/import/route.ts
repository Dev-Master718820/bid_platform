import { NextResponse } from "next/server";
import { ImportError, openResumeFile } from "@/services/import/extract";
import { parseResumeText } from "@/services/import/parse";
import { GroqError, groqKeys } from "@/services/tailor/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST multipart { file: .pdf | .docx } → one of:
 *   { source: "embedded", document, format, edited }  ResumeForge file — exact data (edited: text changed since export)
 *   { source: "parsed", document, notes, model, format? }  text structured by Groq (format: kept from a ResumeForge file)
 *   { source: "text", text }                      other resume, Groq not configured — raw text only
 * Form field prefer=text skips embedded data and reads the file's current text (keeps edits made in Word).
 * Stateless: the file is processed in memory and not stored.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Upload a .pdf or .docx file." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 5 MB." }, { status: 413 });

    const opened = await openResumeFile(new Uint8Array(await file.arrayBuffer()));
    const preferText = form?.get("prefer") === "text";
    if (opened.payload && !preferText) {
      return NextResponse.json({ source: "embedded", kind: opened.kind, document: opened.payload.document, format: opened.payload.format, edited: opened.edited });
    }
    if (opened.text.length < 40) return NextResponse.json({ error: "No readable text found in this file." }, { status: 422 });
    if (!groqKeys().length) {
      return NextResponse.json({ source: "text", kind: opened.kind, text: opened.text });
    }
    const parsed = await parseResumeText(opened.text);
    // A ResumeForge file read as text (edited elsewhere) keeps its original formatting.
    return NextResponse.json({ source: "parsed", kind: opened.kind, ...parsed, ...(opened.payload && { format: opened.payload.format }) });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof GroqError) {
      return NextResponse.json({ error: e.message, ...(e.retryAfter !== undefined && { retryAfter: e.retryAfter }) }, { status: e.status });
    }
    console.error("[import]", e);
    return NextResponse.json({ error: "Could not open this file." }, { status: 500 });
  }
}
