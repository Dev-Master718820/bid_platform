import { z } from "zod";
import { formatPeriod } from "@/utils/dates";

/**
 * `career_history` — the spec's career format, accepted inside Resume JSON:
 *   { company, position, start_date: "2012-03", end_date: "2015-05" | null, location,
 *     employment_type, responsibilities: [], technologies: [] }
 * It is converted into the resume's `experience` entries, so the renderer, tailoring and
 * exports only ever see one shape. Parsing is lenient: malformed fields are dropped.
 */

const s = z.string().trim().max(3000).optional().catch(undefined);
const list = z
  .array(z.union([z.string(), z.number()]).transform(String))
  .max(100)
  .optional()
  .catch(undefined);

export const careerHistoryItemSchema = z.object({
  company: s,
  position: s,
  start_date: s,
  /** null / missing = current role ("Present") */
  end_date: z.string().nullish().catch(undefined),
  location: s,
  employment_type: s,
  description: s,
  responsibilities: list,
  technologies: list,
});

export const careerHistorySchema = z.array(careerHistoryItemSchema).max(50).catch([]);

export function careerToExperience(items: z.infer<typeof careerHistorySchema>) {
  return items.map((c) => ({
    company: c.company ?? "",
    role: c.position ?? "",
    period: formatPeriod(c.start_date, c.end_date, !c.end_date && Boolean(c.start_date)),
    location: c.location ?? "",
    employment_type: c.employment_type ?? "",
    achievements: c.responsibilities?.length ? c.responsibilities : c.description ? [c.description] : [],
    technologies: c.technologies ?? [],
  }));
}

/**
 * Pre-parse step for the resume body: turns `career_history` into `experience` entries
 * (listed before any explicit `experience` items) and removes the key.
 */
export function expandCareerHistory(input: unknown): unknown {
  if (!input || typeof input !== "object" || !("career_history" in input)) return input;
  const { career_history, ...rest } = input as Record<string, unknown>;
  const converted = careerToExperience(careerHistorySchema.parse(career_history ?? []));
  const existing = Array.isArray(rest.experience) ? rest.experience : [];
  return { ...rest, experience: [...converted, ...existing] };
}
