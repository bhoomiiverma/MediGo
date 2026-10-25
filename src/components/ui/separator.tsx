"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Separator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn("mx-auto h-[1px] flex w-full shrink-0 border-none bg-slate-200", className)} {...props} />
  )
);
Separator.displayName = "Separator";
