"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => <DropdownMenuPrimitive.Root {...props} />;
const DropdownMenuTrigger = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => <DropdownMenuPrimitive.Trigger {...props} />;

function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md", className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <DropdownMenuPrimitive.Item
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}
const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) => (
  <DropdownMenuPrimitive.Label className={cn("px-2 py-1.5 text-sm font-medium", className)} {...props} />
);
const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
  <DropdownMenuPrimitive.Separator className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />
);

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
