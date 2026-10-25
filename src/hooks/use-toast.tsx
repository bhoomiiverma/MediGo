"use client";

import * as React from "react";
import { ToastProvider, ToastViewport, Toast as ToastCmp, type Toast, type ToastAction } from "@/components/ui/sonner";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToastState = Toast & { open: boolean };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const ToastList = React.forwardRef<HTMLDivElement, { toasts: ToastState[] }>(({ toasts }, ref) => (
  <div ref={ref} className="fixed top-0 z-[100] max-w-4xl w-full p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:max-w-none pointer-events-none">
    {toasts.map(({ id, ...props }) => (
      <div key={id} className="pointer-events-auto">
        <ToastCmp key={id} toast={{ ...props, open: true, id }} />
      </div>
    ))}
  </div>
));
ToastList.displayName = "ToastList";

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const toast = React.useCallback(({ ...props }: Omit<ToastState, "id" | "open">) => {
    const id = genId();
    const update = (toast: ToastState) =>
      setToasts((old) => old.map((t) => (t.id === id ? { ...t, ...toast } : t)));
    const dismiss = (toastId?: string) => {
      setToasts((old) => old.filter((t) => t.id !== (toastId ?? id)));
    };
    setToasts((old) => [...old, { ...props, id, open: true }].slice(-TOAST_LIMIT));
    React.useEffect(() => {
      const timer = setTimeout(() => dismiss(id), TOAST_REMOVE_DELAY);
      return () => clearTimeout(timer);
    }, [dismiss, id]);
    return { id, dismiss, update };
  }, []);

  return { toast, toasts };
}

export { ToastProvider, ToastViewport, ToastList };
export type { ToastAction, Toast };
