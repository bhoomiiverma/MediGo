"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FormFieldProps extends React.ComponentProps<typeof Label> {
  children?: React.ReactNode;
  label?: string;
  description?: string;
}

const Form = ({ children }: { children?: React.ReactNode }) => <form>{children}</form>;
Form.displayName = "Form";

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(({ className, label, description, children, ...props }, ref) => (
  <div className={cn("space-y-2", className)} ref={ref}>
    {label && <Label>{label}</Label>}
    {children}
    {description && <FormDescription>{description}</FormDescription>}
    <FormMessage />
  </div>
));
FormField.displayName = "FormField";

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium text-slate-900", className)} {...props} />
));
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props} />
));
FormControl.displayName = "FormControl";

const FormMessage = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm font-medium text-red-600", className)} {...props} />
));
FormMessage.displayName = "FormMessage";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-slate-500", className)} {...props} />
));
FormDescription.displayName = "FormDescription";

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription };
