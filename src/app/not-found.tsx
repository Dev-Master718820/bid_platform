import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-brand text-sm font-semibold">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2">The page you’re looking for doesn’t exist.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to the generator</Link>
        </Button>
      </div>
    </div>
  );
}
