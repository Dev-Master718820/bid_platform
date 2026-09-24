import { z } from "zod";
import { SECTION_KEYS, SKILL_CATEGORIES, type ResumeDocument, type SectionKey } from "@/features/resume/schema";

/**
 * Normalizes model typography to plain, ATS-friendly text: some models (e.g. gpt-oss) emit
 * non-breaking hyphens ("high‑throughput") and narrow no-break spaces ("40 M", "99.99 %"),
 * which break keyword matching and may be missing from resume fonts.
 */
export function cleanText(s: string): string {
  return s
    .replace(/[‐‑‒−]/g, "-")
    .replace(/(\d)[    ]+(?=[%kKmMbBxX+]\b|%)/g, "$1")
    .replace(/[    ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .trim();
}

/*
 * What the model is allowed to return: only the tailorable parts of a resume, plus presentation
 * choices the user's prompt asks for (section order / visibility / titles, which entries to include).
 * Parsing is lenient — anything malformed is dropped and the original value is kept.
 */
const str = z.string().max(3000).optional().catch(undefined).transform((v) => (v === undefined ? v : cleanText(v)));
const strList = z
  .array(z.string())
  .max(60)
  .optional()
  .catch(undefined)
  .transform((a) => a?.map(cleanText).filter(Boolean));
const include = z.boolean().optional().catch(undefined);
const sectionKey = z.string().transform((k) => k.trim().toLowerCase());

export const tailorOutputSchema = z.object({
  resume: z
    .object({
      professional_title: str,
      summary: str,
      skills: z.record(z.string(), strList).optional().catch(undefined),
      experience: z.array(z.object({ company: str, role: str, include, achievements: strList, technologies: strList })).max(50).optional().catch(undefined),
      projects: z.array(z.object({ name: str, include, description: str, highlights: strList, technologies: strList })).max(40).optional().catch(undefined),
      sections: z
        .object({
          order: z.array(sectionKey).max(20).optional().catch(undefined),
          hidden: z.array(sectionKey).max(20).optional().catch(undefined),
          titles: z.record(sectionKey, z.string()).optional().catch(undefined),
        })
        .optional()
        .catch(undefined),
    })
    .catch({}),
  notes: strList,
  keywords: strList,
});
export type TailorOutput = z.infer<typeof tailorOutputSchema>;

/** Section settings requested by the tailoring prompt (only the parts it actually set). */
export type SectionOverrides = { order?: SectionKey[]; hidden?: SectionKey[]; titles?: Partial<Record<SectionKey, string>> };

const isSection = (k: string): k is SectionKey => (SECTION_KEYS as readonly string[]).includes(k);

/** Validates the model's section changes; returns undefined when nothing usable was requested. */
export function sanitizeSections(s: NonNullable<TailorOutput["resume"]["sections"]> | undefined): SectionOverrides | undefined {
  if (!s) return undefined;
  const out: SectionOverrides = {};
  const order = s.order?.filter(isSection);
  // Keep the model's order for the sections it named, then the rest in default order.
  if (order?.length) out.order = [...new Set([...order, ...SECTION_KEYS])];
  if (s.hidden) out.hidden = [...new Set(s.hidden.filter(isSection))];
  if (s.titles) {
    const titles = Object.fromEntries(
      Object.entries(s.titles)
        .filter(([k, v]) => isSection(k) && typeof v === "string" && cleanText(v))
        .map(([k, v]) => [k, cleanText(v).slice(0, 60)]),
    );
    if (Object.keys(titles).length) out.titles = titles;
  }
  return Object.keys(out).length ? out : undefined;
}

const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
/** Same entity if names match, one contains the other (e.g. "Contoso" vs "Contoso Cloud"), or the model omitted it. */
const sameEntity = (a: string | undefined, b: string | undefined) => {
  const x = norm(a);
  const y = norm(b);
  return !x || x === y || (y.length > 0 && (x.includes(y) || y.includes(x)));
};

/**
 * Applies model output onto the original resume with facts locked:
 *  - kept from the original: name, contact, companies, job titles, dates, locations, education,
 *    certifications, languages, awards;
 *  - taken from the model (when present): professional title, summary, skills,
 *    experience/project bullets, descriptions and technologies;
 *  - presentation from the prompt: section order / visibility / titles, and dropping entries the
 *    model explicitly marked `include: false` (never inferred from a missing entry).
 * Entries are matched by company+role (projects by name); a positional fallback is used only when
 * the entry plausibly names the same employer/project, so bullets from invented entries are discarded.
 */
export function applyTailoring(original: ResumeDocument, out: TailorOutput): ResumeDocument {
  const o = original.resume;
  const t = out.resume;

  let skills = o.skills;
  if (t.skills) {
    const next = Object.fromEntries(SKILL_CATEGORIES.map((c) => [c, [] as string[]])) as typeof o.skills;
    for (const [key, items] of Object.entries(t.skills)) {
      const cat = (SKILL_CATEGORIES as readonly string[]).includes(key.toLowerCase()) ? (key.toLowerCase() as keyof typeof next) : "other";
      next[cat] = [...new Set([...next[cat], ...(items ?? []).map((s) => s.slice(0, 80))])].slice(0, 60);
    }
    if (SKILL_CATEGORIES.some((c) => next[c].length)) skills = next;
  }

  const experience = o.experience
    .map((e, i) => {
      const byPosition = t.experience?.[i];
      const m =
        t.experience?.find((x) => norm(x.company) === norm(e.company) && norm(x.role) === norm(e.role)) ??
        t.experience?.find((x) => norm(x.company) === norm(e.company)) ??
        // Positional fallback only if it plausibly refers to the same employer — never take bullets from an invented entry.
        (byPosition && sameEntity(byPosition.company, e.company) ? byPosition : undefined);
      if (m?.include === false) return null;
      return {
        ...e,
        achievements: m?.achievements?.length ? m.achievements.slice(0, 40) : e.achievements,
        technologies: m?.technologies?.length ? m.technologies.slice(0, 60) : e.technologies,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const projects = o.projects
    .map((p, i) => {
      const byPosition = t.projects?.[i];
      const m = t.projects?.find((x) => norm(x.name) === norm(p.name)) ?? (byPosition && sameEntity(byPosition.name, p.name) ? byPosition : undefined);
      if (m?.include === false) return null;
      return {
        ...p,
        description: m?.description || p.description,
        highlights: m?.highlights?.length ? m.highlights.slice(0, 20) : p.highlights,
        technologies: m?.technologies?.length ? m.technologies.slice(0, 60) : p.technologies,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const sections = sanitizeSections(t.sections);

  return {
    resume: {
      ...o,
      header: { ...o.header, professional_title: t.professional_title || o.header.professional_title },
      summary: { content: t.summary || o.summary.content },
      skills,
      experience,
      projects,
      ...(sections?.order && { section_order: sections.order }),
      ...(sections?.hidden && { hidden_sections: sections.hidden }),
      ...(sections?.titles && { section_titles: { ...o.section_titles, ...sections.titles } }),
    },
  };
}
