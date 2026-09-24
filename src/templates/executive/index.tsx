import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** Executive — header band in the header color, serif-friendly, double-rule headings. */
const css = `
.rf-t-executive .rf-header{background:var(--rf-header);color:#fff;padding:14pt 16pt;border-radius:2pt;}
.rf-t-executive .rf-name{color:#fff;letter-spacing:.02em;}
.rf-t-executive .rf-title{opacity:.9;font-style:italic;}
.rf-t-executive .rf-contact{opacity:.95;}
.rf-t-executive .rf-h2{color:var(--rf-accent);text-transform:uppercase;letter-spacing:.12em;border-top:1px solid var(--rf-divider);border-bottom:1px solid var(--rf-divider);padding:2.5pt 0;}
.rf-t-executive .rf-role{font-size:calc(var(--rf-size) * 1.05);}
.rf-t-executive .rf-org{font-style:italic;font-weight:400;}
.rf-t-executive .rf-p{text-align:justify;}
`;

export default function ExecutiveTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-executive"
      css={css}
      options={{ skills: "inline", showTech: false }}
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
