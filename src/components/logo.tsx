import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="bg-brand text-brand-foreground grid size-7 place-items-center rounded-md text-sm font-bold">R</span>
      <span className="hidden sm:inline">ResumeForge</span>
    </Link>
  );
}
