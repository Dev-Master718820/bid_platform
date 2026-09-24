import { z } from "zod";
import { formatPeriod } from "@/utils/dates";
import { SKILL_CATEGORIES, resumeDocumentSchema, type ResumeBody, type ResumeDocument } from "./schema";

/**
 * Profile JSON — the candidate's personal record: contact details, summary, education,
 * certifications, projects, skills, languages and awards. (Career history lives in Resume JSON.)
 * Parsing is lenient: every field is optional and unknown keys are ignored.
 *
 * Sensitive fields (date_of_birth, drivers_license_number, ssn, race, full_address) are accepted
 * so a full profile can be pasted as-is, but they are never copied into the resume.
 */

const s = z.string().trim().max(3000).optional().catch(undefined);
const list = z
  .array(z.union([z.string(), z.number()]).transform(String))
  .max(100)
  .optional()
  .catch(undefined);

export const SENSITIVE_PROFILE_KEYS = ["date_of_birth", "drivers_license_number", "ssn", "race", "full_address"] as const;

export const profileSchema = z.object({
  personal_information: z
    .object({
      full_legal_name: s,
      first_name: s,
      middle_name: s,
      last_name: s,
      professional_title: s,
      summary: s,
      country: s,
      state: s,
      city: s,
      linkedin_url: s,
      github_url: s,
      website_url: s,
      email_address: s,
      phone_number: s,
    })
    .partial()
    .optional()
    .catch(undefined),
  professional_title: s,
  summary: s,
  education: z
    .array(z.object({ school: s, degree: s, field_of_study: s, start_date: s, end_date: s, location: s, gpa: s, description: s }))
    .max(20)
    .optional()
    .catch(undefined),
  certifications: z
    .array(z.object({ name: s, issuer: s, issue_date: s, date: s, credential_url: s, url: s }))
    .max(40)
    .optional()
    .catch(undefined),
  projects: z
    .array(z.object({ name: s, role: s, url: s, start_date: s, end_date: s, description: s, highlights: list, technologies: list }))
    .max(40)
    .optional()
    .catch(undefined),
  /** Either grouped ({ languages: [...], frameworks: [...] }) or a flat list. */
  skills: z.union([z.record(z.string(), list), list]).optional().catch(undefined),
  languages: z
    .array(z.union([z.string().transform((language) => ({ language, proficiency: undefined as string | undefined })), z.object({ language: s, proficiency: s })]))
    .max(30)
    .optional()
    .catch(undefined),
  awards: z
    .array(z.object({ title: s, issuer: s, date: s, description: s }))
    .max(40)
    .optional()
    .catch(undefined),
});

export type Profile = z.infer<typeof profileSchema>;

const join = (parts: (string | undefined | null)[], sep: string) => parts.filter(Boolean).join(sep);

/** Profile JSON → Resume JSON. Pure; sensitive fields are never read. */
export function profileToResume(p: Profile): ResumeDocument {
  const pi = p.personal_information ?? {};

  const skills: Record<string, string[]> = {};
  if (Array.isArray(p.skills)) {
    skills.other = p.skills;
  } else if (p.skills) {
    for (const [key, items] of Object.entries(p.skills)) {
      const k = key.toLowerCase();
      const cat = (SKILL_CATEGORIES as readonly string[]).includes(k) ? k : "other";
      skills[cat] = [...(skills[cat] ?? []), ...(items ?? [])];
    }
  }

  return resumeDocumentSchema.parse({
    resume: {
      header: {
        name: join([pi.first_name, pi.middle_name, pi.last_name], " ") || pi.full_legal_name || "",
        professional_title: p.professional_title || pi.professional_title || "",
        email: pi.email_address ?? "",
        phone: pi.phone_number ?? "",
        linkedin: pi.linkedin_url ?? "",
        github: pi.github_url ?? "",
        website: pi.website_url ?? "",
        location: join([pi.city, pi.state, pi.country], ", "),
      },
      summary: { content: p.summary || pi.summary || "" },
      skills,
      education: (p.education ?? []).map((e) => ({
        school: e.school ?? "",
        degree: join([e.degree, e.field_of_study], ", "),
        period: formatPeriod(e.start_date, e.end_date),
        location: e.location ?? "",
        details: join([e.gpa ? `GPA: ${e.gpa}` : "", e.description], " · "),
      })),
      certifications: (p.certifications ?? []).map((c) => ({
        name: c.name ?? "",
        issuer: c.issuer ?? "",
        date: formatPeriod(c.issue_date ?? c.date, null),
        url: c.credential_url ?? c.url ?? "",
      })),
      projects: (p.projects ?? []).map((pr) => ({
        name: pr.name ?? "",
        role: pr.role ?? "",
        period: formatPeriod(pr.start_date, pr.end_date),
        url: pr.url ?? "",
        description: pr.description ?? "",
        highlights: pr.highlights ?? [],
        technologies: pr.technologies ?? [],
      })),
      languages: (p.languages ?? []).map((l) => ({ language: l.language ?? "", proficiency: l.proficiency ?? "" })),
      awards: (p.awards ?? []).map((a) => ({ title: a.title ?? "", issuer: a.issuer ?? "", date: formatPeriod(a.date, null), description: a.description ?? "" })),
    },
  });
}

/**
 * Combines the two inputs: Resume JSON wins wherever it has content; the profile fills whatever
 * the Resume JSON leaves empty. Section order / visibility / titles always come from the Resume JSON.
 */
export function mergeResume(resume: ResumeDocument | null, fromProfile: ResumeDocument | null): ResumeDocument {
  if (!resume) return fromProfile ?? resumeDocumentSchema.parse({ resume: {} });
  if (!fromProfile) return resume;
  const r = resume.resume;
  const p = fromProfile.resume;
  const pick = <K extends keyof ResumeBody>(k: K) => ((r[k] as unknown[]).length ? r[k] : p[k]);

  return {
    resume: {
      ...r,
      header: Object.fromEntries(Object.entries(r.header).map(([k, v]) => [k, v || p.header[k as keyof typeof p.header]])) as ResumeBody["header"],
      summary: { content: r.summary.content || p.summary.content },
      skills: SKILL_CATEGORIES.some((c) => r.skills[c].length) ? r.skills : p.skills,
      experience: pick("experience"),
      education: pick("education"),
      certifications: pick("certifications"),
      projects: pick("projects"),
      languages: pick("languages"),
      awards: pick("awards"),
    },
  };
}

/** Headline fallback: when no title is given anywhere, use the most recent role. */
export function withTitleFallback(doc: ResumeDocument): ResumeDocument {
  const r = doc.resume;
  if (r.header.professional_title || !r.experience[0]?.role) return doc;
  return { resume: { ...r, header: { ...r.header, professional_title: r.experience[0].role } } };
}

/** Removes sensitive keys (for anything persisted in the browser). */
export function stripSensitive(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = structuredClone(raw) as { personal_information?: Record<string, unknown> };
  if (obj.personal_information && typeof obj.personal_information === "object") {
    for (const k of SENSITIVE_PROFILE_KEYS) delete obj.personal_information[k];
  }
  return obj;
}
