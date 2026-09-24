import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Minimal — light weights, spaced small-caps headings, no rules. */
const css = `
.rf-t-minimal .rf-name{font-weight:300;letter-spacing:-.015em;}
.rf-t-minimal .rf-title{color:var(--rf-accent);font-weight:400;}
.rf-t-minimal .rf-contact{color:var(--rf-accent);}
.rf-t-minimal .rf-contact span+span::before{content:"·";}
.rf-t-minimal .rf-h2{font-size:var(--rf-small);font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:var(--rf-accent);margin-bottom:8pt;}
.rf-t-minimal .rf-role{font-weight:600;}
.rf-t-minimal .rf-org{font-weight:400;color:var(--rf-accent);}
.rf-t-minimal .rf-bullets{list-style:none;padding-left:0 !important;}
.rf-t-minimal .rf-bullets li{padding-left:10pt;position:relative;}
.rf-t-minimal .rf-bullets li::before{content:"–";position:absolute;left:0;color:var(--rf-accent);}
.rf-t-minimal .rf-tech b,.rf-t-minimal .rf-skill-row b{font-weight:600;color:var(--rf-header);}
.rf-t-minimal.rf-l-single-column .rf-section{display:grid;grid-template-columns:24% 1fr;column-gap:14pt;}
.rf-t-minimal.rf-l-single-column .rf-h2{text-align:left;margin-top:1.5pt;}
`;

export default function MinimalTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-minimal"
      css={css}
      options={{ skills: "inline", showTech: true, techLabel: "Stack" }}
      header={
        <>
          <h1 className="rf-name">{h.name || "Your Name"}</h1>
          {h.professional_title && <div className="rf-title">{h.professional_title}</div>}
          <ContactLine header={h} />
        </>
      }
    />
  );
}
