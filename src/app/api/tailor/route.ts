import { NextResponse } from "next/server";
import { tailorRequestSchema } from "@/features/tailor/schema";
import { tailorResume } from "@/services/tailor/tailor";
import { GroqError, groqKeys, groqModel, listChatModels } from "@/services/tailor/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Whether tailoring is available, the default model and the models the key can use (never exposes keys). */
export async function GET() {
  const configured = groqKeys().length > 0;
  const models = configured ? await listChatModels() : [];
  return NextResponse.json({ configured, keys: groqKeys().length, model: groqModel(), models });
}

/** POST { document, jobDescription, prompt } → { document, notes, keywords, model }. Stateless. */
export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length > 1_000_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const parsed = tailorRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 422 });
    }
    if (!parsed.data.document.resume.experience.length && !parsed.data.document.resume.summary.content) {
      return NextResponse.json({ error: "Add your Profile JSON or Resume JSON first — there is nothing to tailor yet." }, { status: 422 });
    }
    if (parsed.data.model) {
      const models = await listChatModels();
      if (models.length && !models.includes(parsed.data.model)) {
        return NextResponse.json({ error: `Model "${parsed.data.model}" is not available for this Groq key.` }, { status: 422 });
      }
    }
    return NextResponse.json(await tailorResume(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof GroqError) {
      return NextResponse.json(
        { error: e.message, ...(e.retryAfter !== undefined && { retryAfter: e.retryAfter }) },
        { status: e.status, headers: e.retryAfter !== undefined ? { "Retry-After": String(Math.ceil(e.retryAfter)) } : undefined },
      );
    }
    console.error("[tailor]", e);
    return NextResponse.json({ error: "Tailoring failed. Please try again." }, { status: 500 });
  }
}
