"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Generator } from "./generator";

/** Renders after mount: the inputs live in localStorage, so there is nothing to server-render. */
export function ClientGenerator() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="grid h-dvh place-items-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  return <Generator />;
}
