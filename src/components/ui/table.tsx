"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TableEl = HTMLTableElement;
type THeadEl = HTMLTableSectionElement;
type TBodyEl = HTMLTableSectionElement;
type TFootEl = HTMLTableSectionElement;
type TrEl = HTMLTableRowElement;
type ThEl = HTMLTableHeaderCellElement;
type TdEl = HTMLTableDataCellElement;
type CaptionEl = HTMLTableCaptionElement;

const Table = React.forwardRef<TableEl, React.ComponentPropsWithRef<"table"> & { className?: string }>(({ className, ...props }, ref) => (
  <table ref={ref} className={cn("w-full text-sm border-collapse", className)} {...(props as any)} />
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<THeadEl, React.ComponentPropsWithRef<"thead"> & { className?: string }>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...(props as any)} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<TBodyEl, React.ComponentPropsWithRef<"tbody"> & { className?: string }>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...(props as any)} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<TFootEl, React.ComponentPropsWithRef<"tfoot"> & { className?: string }>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t bg-slate-50/50", className)} {...(props as any)} />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<TrEl, React.ComponentPropsWithRef<"tr"> & { className?: string }>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b transition-colors hover:bg-slate-50/50", className)} {...(props as any)} />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<ThEl, React.ComponentPropsWithRef<"th"> & { className?: string }>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("h-11 px-4 text-left align-middle font-medium text-slate-500", className)} {...(props as any)} />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<TdEl, React.ComponentPropsWithRef<"td"> & { className?: string }>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-4 align-middle", className)} {...(props as any)} />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<CaptionEl, React.ComponentPropsWithRef<"caption"> & { className?: string }>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 rounded-t-none text-sm text-slate-500", className)} {...(props as any)} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
