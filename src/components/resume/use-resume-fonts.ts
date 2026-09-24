"use client";

import { useEffect, useState } from "react";
import { previewFontCssUrl } from "@/templates/fonts";

/**
 * Injects the resume font stylesheet (same files the PDF embeds, served same-origin) and reports
 * when fonts are ready, so the preview re-measures its pages.
 */
export function useResumeFonts(family: string, withMono: boolean) {
  const [readyKey, setReadyKey] = useState(0);

  useEffect(() => {
    const href = previewFontCssUrl(family, withMono);
    let link = document.head.querySelector<HTMLLinkElement>(`link[data-rf-font="${CSS.escape(href)}"]`);
    let cancelled = false;
    const done = () => {
      void document.fonts.ready.then(() => !cancelled && setReadyKey((k) => k + 1));
    };
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.rfFont = href;
      link.addEventListener("load", done, { once: true });
      document.head.appendChild(link);
    } else {
      done();
    }
    return () => {
      cancelled = true;
    };
  }, [family, withMono]);

  return readyKey;
}
