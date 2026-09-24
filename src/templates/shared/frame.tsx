import type { CSSProperties, ReactNode } from "react";
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  sectionTitle,
  visibleSections,
  type ResumeBody,
  type SectionKey,
} from "@/features/resume/schema";
import type { FormatSettings } from "@/features/resume/format";
import { getFont, MONO_CSS } from "@/templates/fonts";

/**
 * Shared rendering primitives.
 *
 * Every template is a React component composed from <ResumeFrame>. Styles are emitted as a
 * scoped <style> block driven by CSS variables so the *same markup* renders identically in the
 * live preview, the static HTML export and headless-Chromium PDF output.
 *
 * The CSS must be self-sufficient: it renders both inside the app (under Tailwind's preflight reset,
 * which e.g. removes list bullets) and in the standalone export HTML (no reset) — set every property
 * a template relies on explicitly.
 *
 * Pagination contract (used by the preview paginator and mirrored by print CSS):
 *   [data-block]           → an unbreakable unit; page breaks may only fall between blocks
 *   [data-keep-next]       → block must stay on the same page as the following block
 */

export type TemplateProps = { data: ResumeBody; format: FormatSettings };

export type SkillsStyle = "inline" | "chips" | "grid";
export type TemplateOptions = {
  skills?: SkillsStyle;
  /** Color section headings with a left-to-right gradient [from, to] (see GradientText). */
  headingGradient?: [string, string];
  /** Show technology list under each experience */
  showTech?: boolean;
  /** Put contact details in the side column (sidebar layout) */
  contactInSide?: boolean;
  /** Label before technology lists */
  techLabel?: string;
  /**
   * In column layouts, render the header at the top of the main column instead of across the page
   * (lets a full-height sidebar start at the very top, e.g. Prism).
   */
  headerInMain?: boolean;
};

const MAIN: SectionKey[] = ["summary", "experience", "projects"];

export function splitSections(body: ResumeBody, layout: FormatSettings["layout"]) {
  const all = visibleSections(body);
  if (layout === "single-column") return { main: all, side: [] as SectionKey[] };
  return { main: all.filter((k) => MAIN.includes(k)), side: all.filter((k) => !MAIN.includes(k)) };
}

export function cssVars(format: FormatSettings): CSSProperties {
  const f = format.font;
  return {
    "--rf-font": getFont(f.family).css,
    "--rf-mono": MONO_CSS,
    "--rf-size": `${f.size}pt`,
    "--rf-name-size": `${f.heading_size}pt`,
    "--rf-h2-size": `${Math.round(f.size * 1.18 * 10) / 10}pt`,
    "--rf-small": `${Math.round(f.size * 0.9 * 10) / 10}pt`,
    "--rf-lh": String(format.spacing.line_height),
    "--rf-ls": `${f.letter_spacing}em`,
    "--rf-gap": `${format.spacing.section_spacing}pt`,
    "--rf-header": format.colors.header,
    "--rf-accent": format.colors.accent,
    "--rf-divider": format.colors.divider,
    "--rf-text": format.colors.text,
    "--rf-align": format.alignment,
    "--rf-justify": format.alignment === "center" ? "center" : format.alignment === "right" ? "flex-end" : "flex-start",
  } as CSSProperties;
}

export const BASE_CSS = `
.rf{font-family:var(--rf-font);font-size:var(--rf-size);line-height:var(--rf-lh);letter-spacing:var(--rf-ls);color:var(--rf-text);background:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact;word-wrap:break-word;overflow-wrap:anywhere;text-rendering:geometricPrecision;}
.rf *{box-sizing:border-box;margin:0;padding:0;}
.rf a{color:inherit;text-decoration:none;}
.rf ul,.rf ol{list-style-position:outside;}
.rf-header{text-align:var(--rf-align);}
.rf-name{font-size:var(--rf-name-size);line-height:1.15;font-weight:700;color:var(--rf-header);}
.rf-title{font-size:calc(var(--rf-size) * 1.15);margin-top:2pt;}
.rf-contact{display:flex;flex-wrap:wrap;justify-content:var(--rf-justify);gap:2pt 12pt;margin-top:5pt;font-size:var(--rf-small);overflow:hidden;}
.rf-contact span{position:relative;}
.rf-contact span+span::before{content:"|";position:absolute;left:-7.5pt;opacity:.45;}
.rf-body{margin-top:var(--rf-gap);}
.rf-header-in-main .rf-body{margin-top:0;}
.rf-header-in-main .rf-main>.rf-header{margin-bottom:var(--rf-gap);}
.rf-section{margin-bottom:var(--rf-gap);}
.rf-section:last-child{margin-bottom:0;}
.rf-h2{font-size:var(--rf-h2-size);font-weight:700;line-height:1.3;text-align:var(--rf-align);margin-bottom:6pt;break-after:avoid;page-break-after:avoid;}
.rf-entry{margin-bottom:8pt;}
.rf-entry:last-child{margin-bottom:0;}
.rf-entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:8pt;break-inside:avoid;break-after:avoid;page-break-after:avoid;}
.rf-role{font-weight:700;}
.rf-org{font-weight:600;}
.rf-meta{font-size:var(--rf-small);white-space:nowrap;opacity:.8;}
.rf-sub{font-size:var(--rf-small);opacity:.8;}
.rf-p{text-align:left;}
.rf-bullets{list-style:disc outside;padding-left:13pt !important;margin-top:3pt !important;}
.rf-bullets li{margin-bottom:1.5pt;break-inside:avoid;page-break-inside:avoid;}
.rf-tech{font-size:var(--rf-small);margin-top:3pt;opacity:.9;}
.rf-tech b{font-weight:600;}
.rf-skill-row{margin-bottom:2pt;break-inside:avoid;}
.rf-skill-row b{font-weight:600;}
.rf-chips{display:flex;flex-wrap:wrap;gap:3pt;margin-top:2pt;}
.rf-chip{font-size:var(--rf-small);padding:0.5pt 5pt;border-radius:3pt;background:color-mix(in srgb,var(--rf-accent) 11%,transparent);color:var(--rf-header);}
.rf-skill-grid{display:grid;grid-template-columns:auto 1fr;gap:2pt 10pt;}
.rf-skill-grid dt{font-weight:600;}
.rf-cols{display:grid;gap:0 18pt;align-items:start;}
.rf-l-two-column .rf-cols{grid-template-columns:minmax(0,1fr) minmax(0,0.52fr);}
.rf-l-sidebar .rf-cols{grid-template-columns:minmax(0,0.5fr) minmax(0,1fr);}
.rf-l-sidebar .rf-side{order:-1;}
.rf-side .rf-entry-head{display:block;}
.rf-side .rf-meta{white-space:normal;}
.rf-side .rf-h2{text-align:left;}
[data-block]{break-inside:avoid;page-break-inside:avoid;}
`;

// ── Building blocks ────────────────────────────────────────────────────────

const stripUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

export function contactItems(h: ResumeBody["header"]) {
  return [
    h.email && { key: "email", label: h.email, href: `mailto:${h.email}` },
    h.phone && { key: "phone", label: h.phone, href: `tel:${h.phone.replace(/[^\d+]/g, "")}` },
    h.location && { key: "location", label: h.location },
    h.linkedin && { key: "linkedin", label: stripUrl(h.linkedin), href: h.linkedin },
    h.github && { key: "github", label: stripUrl(h.github), href: h.github },
    h.website && { key: "website", label: stripUrl(h.website), href: h.website },
  ].filter(Boolean) as { key: string; label: string; href?: string }[];
}

/**
 * Separators sit in the column gap to the left of each item; an item that starts a wrapped line has its
 * separator outside the (overflow-hidden) line box, so no line begins with a dangling "|" (left-aligned).
 */
export function ContactLine({ header, className = "rf-contact" }: { header: ResumeBody["header"]; className?: string }) {
  const items = contactItems(header);
  if (!items.length) return null;
  return (
    <div className={className}>
      {items.map((c) => (
        <span key={c.key} data-contact={c.key}>
          {c.href ? <a href={c.href}>{c.label}</a> : c.label}
        </span>
      ))}
    </div>
  );
}

/** Linear interpolation between two #rrggbb colors. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) + (((pb >> shift) & 255) - ((pa >> shift) & 255)) * t);
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Gradient-colored text that prints cleanly: each letter gets a color interpolated from `from` to `to`.
 * (CSS `background-clip: text` leaves hairline box artifacts in Chromium PDFs.) Color-only spans don't
 * affect shaping, kerning or text extraction.
 */
export function GradientText({ text, from, to }: { text: string; from: string; to: string }) {
  const chars = Array.from(text);
  const last = Math.max(1, chars.length - 1);
  return (
    <>
      {chars.map((c, i) => (
        <span key={i} style={{ color: mixHex(from, to, i / last) }}>
          {c}
        </span>
      ))}
    </>
  );
}

function Heading({ children, gradient }: { children: string; gradient?: [string, string] }) {
  return (
    <h2 className="rf-h2" data-block data-keep-next>
      <span>{gradient ? <GradientText text={children} from={gradient[0]} to={gradient[1]} /> : children}</span>
    </h2>
  );
}

function Skills({ body, style, inSide }: { body: ResumeBody; style: SkillsStyle; inSide: boolean }) {
  const cats = SKILL_CATEGORIES.filter((c) => body.skills[c].length);
  if (style === "chips") {
    return (
      <>
        {cats.map((c) => (
          <div key={c} className="rf-skill-row" data-block>
            <b>{SKILL_CATEGORY_LABELS[c]}</b>
            <div className="rf-chips">
              {body.skills[c].map((s, i) => (
                <span className="rf-chip" key={i}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }
  if (style === "grid" && !inSide) {
    return (
      <dl className="rf-skill-grid" data-block>
        {cats.map((c) => (
          <div key={c} style={{ display: "contents" }}>
            <dt>{SKILL_CATEGORY_LABELS[c]}</dt>
            <dd>{body.skills[c].join(", ")}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <>
      {cats.map((c) => (
        <div key={c} className="rf-skill-row" data-block>
          <b>{SKILL_CATEGORY_LABELS[c]}:</b> {body.skills[c].join(", ")}
        </div>
      ))}
    </>
  );
}

function EntryHead({ left, right, block = true }: { left: ReactNode; right?: string; block?: boolean }) {
  return (
    <div className="rf-entry-head" data-block={block || undefined} data-keep-next={block || undefined}>
      <div>{left}</div>
      {right ? <div className="rf-meta">{right}</div> : null}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.filter((s) => s.trim());
  if (!clean.length) return null;
  return (
    <ul className="rf-bullets">
      {clean.map((a, i) => (
        <li key={i} data-block>
          {a}
        </li>
      ))}
    </ul>
  );
}

function Section({ k, body, opts, inSide }: { k: SectionKey; body: ResumeBody; opts: TemplateOptions; inSide: boolean }) {
  const title = sectionTitle(body, k);
  let content: ReactNode = null;

  switch (k) {
    case "summary":
      content = (
        <p className="rf-p" data-block>
          {body.summary.content}
        </p>
      );
      break;
    case "skills":
      content = <Skills body={body} style={opts.skills ?? "inline"} inSide={inSide} />;
      break;
    case "experience":
      content = body.experience.map((e, i) => (
        <div className="rf-entry" key={i}>
          <EntryHead
            left={
              <>
                <span className="rf-role">{e.role}</span>
                {e.company && <span className="rf-org">{e.role ? " · " : ""}{e.company}</span>}
                {(e.location || e.employment_type) && (
                  <div className="rf-sub">{[e.location, e.employment_type].filter(Boolean).join(" · ")}</div>
                )}
              </>
            }
            right={e.period}
          />
          <Bullets items={e.achievements} />
          {opts.showTech !== false && e.technologies.length > 0 && (
            <div className="rf-tech" data-block>
              <b>{opts.techLabel ?? "Technologies"}:</b> <span className="rf-tech-list">{e.technologies.join(", ")}</span>
            </div>
          )}
        </div>
      ));
      break;
    case "projects":
      content = body.projects.map((p, i) => (
        <div className="rf-entry" key={i}>
          <EntryHead
            left={
              <>
                <span className="rf-role">{p.name}</span>
                {p.role && <span className="rf-org"> · {p.role}</span>}
                {p.url && (
                  <div className="rf-sub">
                    <a href={p.url}>{stripUrl(p.url)}</a>
                  </div>
                )}
              </>
            }
            right={p.period}
          />
          {p.description && (
            <p className="rf-p" data-block>
              {p.description}
            </p>
          )}
          <Bullets items={p.highlights} />
          {opts.showTech !== false && p.technologies.length > 0 && (
            <div className="rf-tech" data-block>
              <b>{opts.techLabel ?? "Technologies"}:</b> <span className="rf-tech-list">{p.technologies.join(", ")}</span>
            </div>
          )}
        </div>
      ));
      break;
    case "education":
      content = body.education.map((e, i) => (
        <div className="rf-entry" key={i} data-block>
          <EntryHead left={<span className="rf-role">{e.school}</span>} right={e.period} block={false} />
          <div>{e.degree}</div>
          {(e.location || e.details) && <div className="rf-sub">{[e.location, e.details].filter(Boolean).join(" · ")}</div>}
        </div>
      ));
      break;
    case "certifications":
      content = body.certifications.map((c, i) => (
        <div className="rf-entry" key={i} data-block>
          <EntryHead left={<span className="rf-org">{c.url ? <a href={c.url}>{c.name}</a> : c.name}</span>} right={c.date} block={false} />
          {c.issuer && <div className="rf-sub">{c.issuer}</div>}
        </div>
      ));
      break;
    case "awards":
      content = body.awards.map((a, i) => (
        <div className="rf-entry" key={i} data-block>
          <EntryHead left={<span className="rf-org">{a.title}</span>} right={a.date} block={false} />
          {(a.issuer || a.description) && <div className="rf-sub">{[a.issuer, a.description].filter(Boolean).join(" — ")}</div>}
        </div>
      ));
      break;
    case "languages":
      content = inSide ? (
        body.languages.map((l, i) => (
          <div key={i} className="rf-skill-row" data-block>
            <b>{l.language}</b>
            {l.proficiency && <> — {l.proficiency}</>}
          </div>
        ))
      ) : (
        <p data-block>{body.languages.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(" · ")}</p>
      );
      break;
  }

  return (
    <section className={`rf-section rf-s-${k}`}>
      <Heading gradient={opts.headingGradient}>{title}</Heading>
      {content}
    </section>
  );
}

export function ResumeFrame({
  data,
  format,
  templateClass,
  css,
  header,
  options = {},
  sideTop,
}: TemplateProps & {
  templateClass: string;
  css: string;
  header: ReactNode;
  options?: TemplateOptions;
  /** Extra content at the top of the side column (e.g. contact in sidebar layouts). */
  sideTop?: ReactNode;
}) {
  const { main, side } = splitSections(data, format.layout);
  // Column layouts collapse to one column when there is nothing to put in the side column.
  const hasCols = format.layout !== "single-column" && (side.length > 0 || Boolean(sideTop));
  const headerInMain = hasCols && Boolean(options.headerInMain);
  const headerEl = (
    <header className="rf-header" data-block>
      {header}
    </header>
  );

  return (
    <div className={`rf ${templateClass} rf-l-${format.layout} rf-a-${format.alignment}${hasCols ? " rf-has-cols" : ""}${headerInMain ? " rf-header-in-main" : ""}`} style={cssVars(format)}>
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + css }} />
      {!headerInMain && headerEl}
      <div className="rf-body">
        {hasCols ? (
          <div className="rf-cols">
            <div className="rf-main">
              {headerInMain && headerEl}
              {main.map((k) => (
                <Section key={k} k={k} body={data} opts={options} inSide={false} />
              ))}
            </div>
            <aside className="rf-side">
              {sideTop}
              {side.map((k) => (
                <Section key={k} k={k} body={data} opts={options} inSide />
              ))}
            </aside>
          </div>
        ) : (
          main.map((k) => <Section key={k} k={k} body={data} opts={options} inSide={false} />)
        )}
      </div>
    </div>
  );
}
