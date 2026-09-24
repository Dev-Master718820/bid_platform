"use client";

import { useRef } from "react";
import { AlertCircle, CheckCircle2, Eraser, FileUp, Info, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/stores/resume-builder-store";
import { cn } from "@/lib/utils";

const COPY = {
  profile: {
    title: "Profile JSON",
    placeholder: `{
  "personal_information": { "first_name": "…", "last_name": "…", "email_address": "…" },
  "education": [ … ], "certifications": [ … ],
  "skills": { "languages": [ … ] }, "languages": [ … ]
}`,
    note: "Fills everything the Resume JSON leaves empty. SSN, driver's license, date of birth, race and full address are ignored — never rendered or saved.",
  },
  resume: {
    title: "Resume JSON",
    placeholder: `{
  "resume": {
    "header": { "name": "…", "professional_title": "…", "email": "…" },
    "summary": { "content": "…" },
    "career_history": [
      { "company": "Microsoft", "position": "Senior Software Engineer",
        "start_date": "2012-03", "end_date": "2015-05", "location": "Redmond, WA",
        "employment_type": "Full Time",
        "responsibilities": [ "…" ], "technologies": [ "Java", "Azure" ] }
    ],
    "skills": { "languages": [ … ] }
  }
}`,
    note: "Holds your career_history (end_date null = Present). Takes priority: any section or header field filled here overrides the profile.",
  },
} as const;

export function JsonInput({ kind }: { kind: "profile" | "resume" }) {
  const text = useBuilder((s) => (kind === "profile" ? s.profileText : s.resumeText));
  const errors = useBuilder((s) => (kind === "profile" ? s.profileErrors : s.resumeErrors));
  const setText = useBuilder((s) => (kind === "profile" ? s.setProfileText : s.setResumeText));
  const fileRef = useRef<HTMLInputElement>(null);
  const copy = COPY[kind];

  const upload = async (file: File) => {
    if (file.size > 1_000_000) {
      toast.error("File is larger than 1 MB");
      return;
    }
    setText(await file.text());
    toast.success(`Loaded ${file.name}`);
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <h2 className="mr-auto text-sm font-semibold">{copy.title}</h2>
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          <FileUp /> Upload
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!text.trim()}
          onClick={() => {
            try {
              setText(JSON.stringify(JSON.parse(text), null, 2));
            } catch {
              toast.error("Fix the JSON syntax first");
            }
          }}
        >
          <WandSparkles /> Format
        </Button>
        <Button variant="ghost" size="sm" disabled={!text} onClick={() => setText("")}>
          <Eraser /> Clear
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-muted-foreground flex gap-1.5 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" /> {copy.note}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: a, selectionEnd: b } = el;
            setText(text.slice(0, a) + "  " + text.slice(b));
            requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          if (f) {
            e.preventDefault();
            void upload(f);
          }
        }}
        placeholder={copy.placeholder}
        spellCheck={false}
        className={cn(
          "bg-muted/40 placeholder:text-muted-foreground/60 min-h-0 flex-1 resize-none rounded-md border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-[3px]",
          errors.length ? "border-destructive focus-visible:ring-destructive/30" : "focus-visible:ring-ring/50",
        )}
        aria-label={copy.title}
      />

      {errors.length > 0 ? (
        <div className="bg-destructive/10 text-destructive max-h-32 overflow-auto rounded-md p-2 text-xs">
          <div className="mb-1 font-medium">Not applied — the preview shows the last valid version.</div>
          {errors.map((e, i) => (
            <div key={i} className="flex gap-1.5">
              <AlertCircle className="mt-0.5 size-3 shrink-0" /> {e}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {text.trim() ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Valid — applied to the preview
            </>
          ) : (
            "Paste JSON, drop a .json file here, or upload one."
          )}
        </p>
      )}
    </div>
  );
}
