import { ContactLine, ResumeFrame, type TemplateProps } from "@/templates/shared/frame";

/** ATS Professional — no graphics, standard headings, predictable reading order. */
const css = `
.rf-t-ats .rf-name{text-transform:uppercase;letter-spacing:.04em;}
.rf-t-ats .rf-title{font-weight:600;}
.rf-t-ats .rf-h2{text-transform:uppercase;letter-spacing:.06em;color:var(--rf-accent);border-bottom:1px solid var(--rf-divider);padding-bottom:2pt;}
.rf-t-ats .rf-org{font-weight:400;}
.rf-t-ats .rf-meta{opacity:1;}
`;

export default function AtsTemplate({ data, format }: TemplateProps) {
  const h = data.header;
  return (
    <ResumeFrame
      data={data}
      format={format}
      templateClass="rf-t-ats"
      css={css}
      options={{ skills: "inline", showTech: true }}
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
