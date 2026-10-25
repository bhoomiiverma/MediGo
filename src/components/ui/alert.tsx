"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "success" | "info";

const ICONS: Record<Variant, React.ElementType> = {
  default: Info,
  destructive: AlertTriangle,
  success: CheckCircle2,
  info: Clock,
};

export function Alert({ className, variant = "default", title, children }: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant; title?: string; children?: React.ReactNode }) {
  const Icon = ICONS[variant];
  return (
    <div className={cn("rounded-lg border p-4 flex items-start gap-3", {
      success: "bg-green-50 border-green-100 text-green-800",
      destructive: "bg-red-50 border-red-100 text-red-800",
      info: "bg-blue-50 border-blue-100 text-blue-800",
      default: "bg-slate-50 border-slate-200 text-slate-800",
    }, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="text-sm leading-none">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
