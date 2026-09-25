import { ContactLine, ResumeFrame, contactItems, type TemplateProps } from "@/templates/shared/frame";

/** Modern — accent color, chips, left-bar headings. Sidebar layout moves contact into the sidebar. */
const css = `
.rf-t-modern .rf-header{padding-bottom:10pt;border-bottom:2pt solid var(--rf-accent);}
.rf-t-modern .rf-name{letter-spacing:-.01em;}
.rf-t-modern .rf-title{color:var(--rf-accent);font-weight:600;}
.rf-t-modern .rf-h2{color:var(--rf-header);display:flex;align-items:center;gap:6pt;justify-content:var(--rf-h-justify);}
.rf-t-modern .rf-h2::before{content:"";width:3pt;height:1em;border-radius:1pt;background:var(--rf-accent);flex:none;}
.rf-t-modern .rf-org{color:var(--rf-accent);}
.rf-t-modern .rf-bullets li::marker{color:var(--rf-accent);}
.rf-t-modern.rf-l-sidebar .rf-side{background:color-mix(in srgb,var(--rf-accent) 6%,#fff);padding:10pt;border-radius:4pt;}
.rf-t-modern .rf-side-contact{margin-bottom:var(--rf-gap);font-size:var(--rf-small);}
.rf-t-modern .rf-side-contact div{margin-bottom:2pt;}
`;

export default function ModernTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  const sidebar = format.layout === "sidebar";
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-modern"
      css={css}
      options={{ skills: "chips", showTech: true }}
      header={
        <>
          <h1 className="rf-name">{h.name || "Your Name"}</h1>
          {h.professional_title && <div className="rf-title">{h.professional_title}</div>}
          {!sidebar && <ContactLine header={h} />}
        </>
      }
      sideTop={
        sidebar && contactItems(h).length > 0 ? (
          <section className="rf-section rf-side-contact" data-block>
            <h2 className="rf-h2">Contact</h2>
            {contactItems(h).map((c) => (
              <div key={c.key}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</div>
            ))}
          </section>
        ) : null
      }
    />
  );
}
