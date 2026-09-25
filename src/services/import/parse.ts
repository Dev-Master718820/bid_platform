import "server-only";
import { cleanText } from "@/features/tailor/apply";
import { DEFAULT_SECTION_TITLES, SECTION_KEYS, resumeDocumentSchema, type ResumeDocument } from "@/features/resume/schema";
import { GroqError, groqJson, type GroqUsage } from "@/services/tailor/groq";

/**
 * Structures the plain text of a resume (from any PDF/DOCX) into Resume JSON with Groq.
 * The model transcribes — it must not rewrite, summarize or invent anything.
 */

const MAX_TEXT = 20_000;

const SYSTEM = `You convert the text of a resume into structured JSON. You are a transcriber, not a writer.

Rules:
1. Copy text exactly as written: names, titles, companies, dates, bullet points, skills. Do not rephrase, summarize, translate, fix, or invent anything. Omit fields that are not present (use "" or []).
2. Every job goes in "experience" (most recent first, as in the document). "period" is the date range exactly as written (e.g. "Jan 2019 – Mar 2021"). Bullet points go in "achievements", one string per bullet, without the bullet character. A "Technologies/Stack/Tools:" line under a job goes in "technologies" as a list.
3. Skills: keep the document's own grouping and group names as keys (e.g. {"Frontend": [...], "Backend": [...]}). If skills are not grouped, use a single group named "".
4. "section_titles": map each section you filled to the heading the document uses, when it differs from the default (e.g. {"experience": "Work History"}). Section keys: ${SECTION_KEYS.join(", ")}. Defaults: ${SECTION_KEYS.map((k) => `${k}="${DEFAULT_SECTION_TITLES[k]}"`).join(", ")}.
5. "section_order": the section keys in the order they appear in the document.
6. Respond with one JSON object only:
{
  "resume": {
    "header": { "name": "", "professional_title": "", "email": "", "phone": "", "linkedin": "", "location": "", "github": "", "website": "" },
    "summary": { "content": "" },
    "skills": { "<group>": [""] },
    "experience": [ { "company": "", "role": "", "period": "", "location": "", "employment_type": "", "achievements": [""], "technologies": [""] } ],
    "education": [ { "school": "", "degree": "", "period": "", "location": "", "details": "" } ],
    "certifications": [ { "name": "", "issuer": "", "date": "", "url": "" } ],
    "projects": [ { "name": "", "role": "", "period": "", "url": "", "description": "", "highlights": [""], "technologies": [""] } ],
    "languages": [ { "language": "", "proficiency": "" } ],
    "awards": [ { "title": "", "issuer": "", "date": "", "description": "" } ],
    "section_order": [""],
    "section_titles": { "<section key>": "" }
  },
  "notes": [""]   // 0–3 short notes about anything you could not place
}`;

/** Recursively normalizes model typography (non-breaking hyphens, narrow spaces…) in all strings. */
function cleanDeep<T>(v: T): T {
  if (typeof v === "string") return cleanText(v) as T;
  if (Array.isArray(v)) return v.map(cleanDeep) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanDeep(x)])) as T;
  return v;
}

export async function parseResumeText(text: string): Promise<{ document: ResumeDocument; notes: string[]; model: string; usage?: GroqUsage; truncated: boolean }> {
  const truncated = text.length > MAX_TEXT;
  const { content, model, usage } = await groqJson(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Resume text:\n<resume>\n${text.slice(0, MAX_TEXT)}\n</resume>` },
    ],
    { temperature: 0, maxTokens: 8192 },
  );
  let raw: { resume?: unknown; notes?: unknown };
  try {
    raw = JSON.parse(content);
  } catch {
    throw new GroqError("The model returned invalid JSON while reading the resume. Please try again.", 502);
  }
  const parsed = resumeDocumentSchema.safeParse({ resume: cleanDeep(raw.resume ?? {}) });
  if (!parsed.success) throw new GroqError("Could not structure this resume. Please try again.", 502);
  const notes = Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === "string").slice(0, 3) : [];
  return { document: parsed.data, notes, model, usage, truncated };
}
