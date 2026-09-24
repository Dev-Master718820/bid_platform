"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, FileJson, FileUp, PencilLine, RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatSettingsSchema } from "@/features/resume/format";
import { TEMPLATE_KEYS } from "@/features/resume/format";
import { TEMPLATE_META } from "@/templates/meta";
import { useBuilder } from "@/stores/resume-builder-store";
import { cn } from "@/lib/utils";
import { DesignPanel } from "./design-panel";
import { SectionsPanel } from "./sections-panel";
import { JsonInput } from "./json-input";
import { PreviewPane } from "./preview-pane";
import { ExportMenu } from "./export-menu";
import { TailorPanel } from "./tailor-panel";

const TEMPLATES = TEMPLATE_KEYS.map((key) => ({ key, ...TEMPLATE_META[key] }));

function EmptyState() {
  const loadSample = useBuilder((s) => s.loadSample);
  return (
    <div className="bg-background/95 max-w-md rounded-xl border p-6 text-center shadow-lg backdrop-blur">
      <FileJson className="text-brand mx-auto size-8" />
      <h2 className="mt-3 text-lg font-semibold">Generate a resume from JSON</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Paste or upload your <b>Profile JSON</b> and/or <b>Resume JSON</b> on the left. Adjust template and formatting, then download PDF or DOCX.
      </p>
      <Button className="mt-4" variant="brand" onClick={loadSample}>
        <Sparkles /> Load sample data
      </Button>
    </div>
  );
}

function ModeSwitch() {
  const mode = useBuilder((s) => s.mode);
  const setMode = useBuilder((s) => s.setMode);
  return (
    <div className="bg-muted flex rounded-md p-0.5 text-sm font-medium" role="radiogroup" aria-label="Generation mode">
      {(["normal", "tailor"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1",
            mode === m ? (m === "tailor" ? "bg-brand text-brand-foreground shadow-sm" : "bg-background shadow-sm") : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "tailor" && <WandSparkles className="size-3.5" />}
          {m === "normal" ? "Normal" : "Tailor"}
        </button>
      ))}
    </div>
  );
}

function TailorEmptyState() {
  return (
    <div className="bg-background/95 max-w-md rounded-xl border p-5 text-center shadow-lg backdrop-blur">
      <WandSparkles className="text-brand mx-auto size-7" />
      <h2 className="mt-2 font-semibold">Tailor mode</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Paste a job description in the <b>Tailor</b> tab and click <b>Generate tailored resume</b>. Until then, the preview shows your normal resume.
      </p>
    </div>
  );
}

function FormatImport() {
  const ref = useRef<HTMLInputElement>(null);
  const replaceFormat = useBuilder((s) => s.replaceFormat);
  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => ref.current?.click()}>
        <FileUp /> Import formatting JSON
      </Button>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const res = formatSettingsSchema.safeParse(JSON.parse(await f.text()));
            if (!res.success) throw new Error(res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
            replaceFormat(res.data);
            toast.success("Formatting applied");
          } catch (err) {
            toast.error(`Invalid formatting JSON: ${(err as Error).message}`);
          }
        }}
      />
    </>
  );
}

export function Generator() {
  const fileName = useBuilder((s) => s.fileName);
  const setFileName = useBuilder((s) => s.setFileName);
  const loadSample = useBuilder((s) => s.loadSample);
  const clearAll = useBuilder((s) => s.clearAll);
  const hasInput = useBuilder((s) => Boolean(s.profileDoc || s.resumeDoc));
  const mode = useBuilder((s) => s.mode);
  const hasTailored = useBuilder((s) => Boolean(s.tailored));
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [tab, setTab] = useState("profile");

  // Start on the Resume JSON tab if that's the only input the user has.
  useEffect(() => {
    const s = useBuilder.getState();
    if (s.mode === "tailor") setTab("tailor");
    else if (!s.profileText.trim() && s.resumeText.trim()) setTab("resume");
  }, []);

  // Switching modes jumps to the relevant tab.
  useEffect(() => {
    setTab((t) => (mode === "tailor" ? "tailor" : t === "tailor" ? "profile" : t));
  }, [mode]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Logo />
        <div className="ml-2">
          <ModeSwitch />
        </div>
        <div className="text-muted-foreground ml-3 hidden items-center gap-1.5 text-sm xl:flex">
          <span>File name</span>
          <Input value={fileName} onChange={(e) => setFileName(e.target.value)} className="h-8 w-52" aria-label="Download file name" />
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={loadSample}>
          <Sparkles /> <span className="hidden sm:inline">Sample</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasInput}
          onClick={() => {
            if (confirm("Clear both JSON inputs? Formatting is kept.")) clearAll();
          }}
        >
          <RotateCcw /> <span className="hidden sm:inline">Clear</span>
        </Button>
        <ThemeToggle />
        <ExportMenu />
      </header>

      <div className="flex border-b p-1.5 lg:hidden">
        <div className="bg-muted grid w-full grid-cols-2 rounded-md p-0.5 text-sm font-medium">
          {(["edit", "preview"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("flex items-center justify-center gap-1.5 rounded py-1.5", view === v ? "bg-background shadow-sm" : "text-muted-foreground")}>
              {v === "edit" ? <PencilLine className="size-4" /> : <Eye className="size-4" />}
              {v === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn("bg-muted/20 flex min-h-0 w-full flex-col border-r lg:w-[480px] lg:shrink-0 xl:w-[540px]", view === "preview" && "hidden lg:flex")}>
          <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
            <div className="border-b px-3 py-2">
              <TabsList className="w-full">
                {mode === "tailor" && (
                  <TabsTrigger value="tailor">
                    <WandSparkles /> Tailor
                  </TabsTrigger>
                )}
                <TabsTrigger value="profile">Profile JSON</TabsTrigger>
                <TabsTrigger value="resume">Resume JSON</TabsTrigger>
                <TabsTrigger value="format">Format</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="tailor" className="p-3">
                <TailorPanel />
              </TabsContent>
              <TabsContent value="profile" className="h-full p-3">
                <JsonInput kind="profile" />
              </TabsContent>
              <TabsContent value="resume" className="h-full p-3">
                <JsonInput kind="resume" />
              </TabsContent>
              <TabsContent value="format" className="grid gap-3 p-3">
                <FormatImport />
                <DesignPanel templates={TEMPLATES} />
              </TabsContent>
              <TabsContent value="sections" className="p-3">
                <SectionsPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className={cn("relative min-h-0 min-w-0 flex-1", view === "edit" && "hidden lg:block")}>
          <PreviewPane />
          {hasInput && mode === "tailor" && !hasTailored && (
            <div className="pointer-events-none absolute inset-x-0 top-11 flex justify-center p-4">
              <div className="pointer-events-auto">
                <TailorEmptyState />
              </div>
            </div>
          )}
          {!hasInput && (
            <div className="pointer-events-none absolute inset-0 top-11 flex items-start justify-center p-6 pt-24">
              <div className="pointer-events-auto">
                <EmptyState />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
