"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "critical" | "info" | "neutral";
}

const variants: Record<string, string> = {
  default: "border-transparent bg-slate-900 text-white",
  secondary: "border-transparent bg-slate-200 text-slate-900",
  destructive: "border-transparent bg-red-600 text-white",
  outline: "border-slate-200 text-slate-700",
  success: "border-green-200 bg-green-100 text-green-700",
  warning: "border-amber-200 bg-amber-100 text-amber-700",
  critical: "border-red-200 bg-red-100 text-red-700",
  info: "border-blue-200 bg-blue-100 text-blue-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)} {...props} />
  );
}

export { variants as badgeVariants };
