"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = ({ delayDuration = 200, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
const Tooltip = (props: React.ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipPrimitive.Root {...props} />;
const TooltipTrigger = (props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) => <TooltipPrimitive.Trigger {...props} />;
function TooltipContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={sideOffset} className={cn("bg-primary text-primary-foreground z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance", className)} {...props} />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
