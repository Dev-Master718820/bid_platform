import { ContactLine, ResumeFrame, contactItems, type TemplateProps } from "@/templates/shared/frame";

/**
 * Prism — full-height gradient sidebar (painted as a page background band so it spans every page)
 * with white text; name and experience in the main column. Single-column falls back to a gradient header card.
 */
const css = `
.rf-t-prism .rf-name{color:var(--rf-header);letter-spacing:-.01em;}
.rf-t-prism .rf-title{color:var(--rf-accent);font-weight:600;}
.rf-t-prism .rf-h2{color:var(--rf-header);text-transform:uppercase;letter-spacing:.12em;font-size:var(--rf-small);display:flex;align-items:center;gap:6pt;}
.rf-t-prism .rf-h2::before{content:"";width:12pt;height:2.5pt;border-radius:2pt;background:linear-gradient(90deg,var(--rf-header),var(--rf-accent));flex:none;}
.rf-t-prism .rf-org{color:var(--rf-accent);}
.rf-t-prism .rf-bullets li::marker{color:var(--rf-accent);}
.rf-t-prism .rf-side{color:#fff;}
.rf-t-prism .rf-side .rf-h2{color:#fff;}
.rf-t-prism .rf-side .rf-h2::before{background:rgba(255,255,255,.85);}
.rf-t-prism .rf-side .rf-org,.rf-t-prism .rf-side .rf-role{color:#fff;}
.rf-t-prism .rf-side .rf-sub,.rf-t-prism .rf-side .rf-meta{opacity:.85;}
.rf-t-prism .rf-side .rf-chip{background:rgba(255,255,255,.18);color:#fff;border-radius:20pt;}
.rf-t-prism .rf-side-contact{margin-bottom:var(--rf-gap);font-size:var(--rf-small);}
.rf-t-prism .rf-side-contact div{margin-bottom:2.5pt;}
.rf-t-prism.rf-l-single-column .rf-header,.rf-t-prism:not(.rf-has-cols) .rf-header{background:linear-gradient(135deg,var(--rf-header),var(--rf-accent));padding:16pt 18pt;border-radius:8pt;}
.rf-t-prism:not(.rf-has-cols) .rf-name,.rf-t-prism:not(.rf-has-cols) .rf-title,.rf-t-prism:not(.rf-has-cols) .rf-contact{color:#fff;}
`;

export default function PrismTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  const cols = format.layout !== "single-column";
  const contacts = contactItems(h);
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-prism"
      css={css}
      options={{ skills: "chips", showTech: true, headerInMain: true }}
      header={
        <>
          <h1 className="rf-name">{h.name || "Your Name"}</h1>
          {h.professional_title && <div className="rf-title">{h.professional_title}</div>}
          {!cols && <ContactLine header={h} />}
        </>
      }
      sideTop={
        cols && contacts.length > 0 ? (
          <section className="rf-section rf-side-contact" data-block>
            <h2 className="rf-h2">
              <span>Contact</span>
            </h2>
            {contacts.map((c) => (
              <div key={c.key}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</div>
            ))}
          </section>
        ) : null
      }
    />
  );
}
