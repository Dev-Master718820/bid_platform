"use client";

import { useState } from "react";
import { Braces, ChevronDown, Download, FileText, FileType2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBuilder, useResumeDocument } from "@/stores/resume-builder-store";
import { downloadFile, downloadText } from "@/utils/download";

export function ExportMenu() {
  const document = useResumeDocument();
  const format = useBuilder((s) => s.format);
  const fileName = useBuilder((s) => s.fileName);
  const embedData = useBuilder((s) => s.embedData);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (kind: "pdf" | "docx") => {
    setBusy(kind);
    const t = toast.loading(`Generating ${kind.toUpperCase()}…`);
    try {
      await downloadFile(`/api/export/${kind}`, `${fileName || "resume"}.${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, format, fileName: fileName || "resume", embed: embedData }),
      });
      toast.success(`${kind.toUpperCase()} downloaded`, { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="brand" disabled={!!busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          <span className="hidden sm:inline">Download</span>
          <ChevronDown className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => void run("pdf")}>
          <FileText /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("docx")}>
          <FileType2 /> DOCX (Word)
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault(); // keep the menu open while toggling
            useBuilder.getState().setEmbedData(!embedData);
          }}
          className="text-xs"
        >
          <input type="checkbox" readOnly checked={embedData} className="accent-[var(--brand)] pointer-events-none size-3.5" aria-label="Include editable data" />
          <span>
            Include editable data
            <span className="text-muted-foreground block text-[11px] leading-tight">Reopen the PDF/DOCX here later to edit it</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => downloadText(JSON.stringify(document, null, 2), `${fileName || "resume"}.json`)}>
          <Braces /> Merged resume JSON
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadText(JSON.stringify(format, null, 2), `${fileName || "resume"}.format.json`)}>
          <Braces /> Formatting JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
