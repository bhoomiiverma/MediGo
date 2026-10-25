"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: ToastAction;
};

type ToastState = Toast & { open: boolean };

const toastTypes: Record<string, string> = {
  default: "bg-white text-slate-900 border-slate-200 shadow-lg",
  destructive: "bg-red-50 text-red-900 border-red-100 shadow-lg",
  success: "bg-green-50 text-green-900 border-green-100 shadow-lg",
};

type ToastOwnProps = {
  toast: ToastState;
  className?: string;
};

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ToastPrimitive.Viewport;

export function Toast({ className, toast }: ToastOwnProps) {
  const icon = toast.variant === "destructive" ? <AlertCircle className="h-4 w-4 shrink-0 text-red-500" /> : toast.variant === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />;
  return (
    <ToastPrimitive.Root className={cn("group pointer-events-auto flex items-center gap-3 w-full rounded-xl border p-3 text-sm", toastTypes[toast.variant ?? "default"], className)}>
      <div className="shrink-0">{icon}</div>
      <div className="overflow-hidden">
        {toast.title && <div className="font-semibold">{toast.title}</div>}
        {toast.description && <div className="opacity-80">{toast.description}</div>}
      </div>
      {toast.action && (
        <ToastPrimitive.Action altText={toast.action.label} onClick={toast.action.onClick} className="ml-auto shrink-0">
          <button className="rounded-sm text-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-current">{toast.action.label}</button>
        </ToastPrimitive.Action>
      )}
      <ToastPrimitive.Close className="ml-auto shrink-0 opacity-50 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current disabled:pointer-events-none disabled:opacity-50">
        <button className="p-1">
          <X className="h-3 w-3" />
          <span className="sr-only">Close</span>
        </button>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
