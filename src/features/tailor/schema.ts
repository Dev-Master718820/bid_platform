import { z } from "zod";
import { resumeDocumentSchema } from "@/features/resume/schema";
import type { SectionOverrides } from "./apply";

export const JD_MAX = 20_000;
export const PROMPT_MAX = 4_000;

export const DEFAULT_TAILOR_PROMPT = `Tailor my resume to this job description.
- Rewrite the professional title and summary to match the role (3–4 sentences, no first person).
- Rewrite and reorder experience bullets to emphasize the most relevant work; start each with a strong action verb and keep every metric that is already there.
- Use the job description's keywords naturally where they are truthful for my experience.
- Reorder skills so the most relevant come first; drop skills that are irrelevant to this job.
- Keep bullets concise (one or two lines).`;

export const tailorRequestSchema = z.object({
  document: resumeDocumentSchema,
  jobDescription: z.string().trim().min(50, "Paste a job description (at least 50 characters)").max(JD_MAX),
  prompt: z.string().trim().max(PROMPT_MAX).default(""),
  /** Optional Groq model id; must be one of the key's available chat models. */
  model: z.string().trim().max(100).optional(),
});
export type TailorRequest = z.infer<typeof tailorRequestSchema>;

export type TailorResult = {
  document: z.infer<typeof resumeDocumentSchema>;
  /** Section order / visibility / titles the prompt asked for (overrides the user's own section settings). */
  sections?: SectionOverrides;
  notes: string[];
  keywords: string[];
  model: string;
  /** Tokens used by this request (counts against Groq's per-minute limit). */
  usage?: { prompt: number; completion: number; total: number };
};
