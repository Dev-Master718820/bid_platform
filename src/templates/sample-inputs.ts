/**
 * Example inputs shown by "Load sample". The profile holds personal details, education,
 * certifications and languages; the resume JSON holds the career history plus a tailored title,
 * summary and skills. Both are merged into one resume.
 */
export const SAMPLE_PROFILE = {
  personal_information: {
    full_legal_name: "Alexander J. Morgan",
    first_name: "Alex",
    middle_name: "",
    last_name: "Morgan",
    country: "USA",
    state: "WA",
    city: "Seattle",
    linkedin_url: "https://linkedin.com/in/alexmorgan",
    github_url: "https://github.com/alexmorgan",
    email_address: "alex.morgan@example.com",
    phone_number: "+1 (206) 555-0142",
  },
  education: [{ school: "University of Washington", degree: "B.S.", field_of_study: "Computer Science", start_date: "2008-09", end_date: "2012-06" }],
  certifications: [{ name: "AWS Certified Solutions Architect – Professional", issuer: "Amazon Web Services", issue_date: "2023-04" }],
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Professional" },
  ],
};

export const SAMPLE_RESUME_INPUT = {
  resume: {
    header: { professional_title: "Senior Backend Engineer" },
    summary: {
      content:
        "Backend-focused engineer with 10+ years building distributed systems and cloud platforms. Led teams shipping high-availability services used by millions, with a track record of cutting infrastructure cost and latency.",
    },
    career_history: [
      {
        company: "Contoso Cloud",
        position: "Staff Software Engineer",
        start_date: "2019-06",
        end_date: null,
        location: "Seattle, WA",
        employment_type: "Full Time",
        responsibilities: [
          "Architected an event-driven billing platform processing 40M events/day with 99.99% availability.",
          "Reduced p95 API latency by 62% by redesigning caching and query patterns across 14 services.",
          "Mentored 8 engineers and introduced a design-review process adopted org-wide.",
        ],
        technologies: ["Go", "Kafka", "PostgreSQL", "Kubernetes"],
      },
      {
        company: "Fabrikam",
        position: "Senior Software Engineer",
        start_date: "2015-06",
        end_date: "2019-05",
        location: "Bellevue, WA",
        employment_type: "Full Time",
        responsibilities: [
          "Led migration of a monolith to 20+ Spring Boot microservices, cutting release time from weeks to hours.",
          "Built a real-time analytics pipeline that saved $1.2M/year in third-party tooling.",
        ],
        technologies: ["Java", "Spring Boot", "AWS", "Redis"],
      },
      {
        company: "Microsoft",
        position: "Senior Software Engineer",
        start_date: "2012-03",
        end_date: "2015-05",
        location: "Redmond, WA",
        employment_type: "Full Time",
        responsibilities: ["Developed scalable backend applications", "Built cloud-based services"],
        technologies: ["Java", "Spring Boot", "Azure"],
      },
    ],
    skills: {
      languages: ["Java", "Go", "TypeScript", "Python", "SQL"],
      frameworks: ["Spring Boot", "Node.js", "React"],
      databases: ["PostgreSQL", "Redis", "DynamoDB"],
      cloud: ["Azure", "AWS", "Kubernetes", "Terraform"],
      tools: ["Kafka", "GitHub Actions", "Datadog"],
    },
  },
};
