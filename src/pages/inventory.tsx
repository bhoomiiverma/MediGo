"use client";

import * as React from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Building, Droplet, Package, MapPin } from "lucide-react";
import { formatRelative } from "@/types";
import { Link } from "wouter";

const ICONS: Record<string, React.ElementType> = {
  "Blood Products": Droplet,
  Antidotes: Package,
  Trauma: Building,
  "Wound Care": Package,
  Medicines: Package,
};

export function InventoryPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<any[]>([]);
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [filters, setFilters] = React.useState({
    search: "",
    facility: "",
    category: "",
    stock: "",
  });
  const [sort] = React.useState<{ key: string; dir: "asc" | "desc" }>({ key: "updated_at", dir: "desc" });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_accepted", "request_dispatched", "request_delivered", "demo_reset"],
    () => {
      load();
      toast({ title: "Inventory updated", description: "Stock levels changed due to dispatch activity" });
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [inv, fs, its] = await Promise.all([api.inventories(), api.facilities(), api.items()]);
      setData(inv);
      setFacilities(fs);
      setItems(its);
    } finally {
      setLoading(false);
    }
  }

  const facilityById = Object.fromEntries(facilities.map((f: any) => [f.id, f.name]));
  const itemById = Object.fromEntries(items.map((i: any) => [i.id, i]));

  const filtered = data
    .filter((i) => {
      const f = facilityById[i.facility_id] || "";
      const it = itemById[i.item_id] || {};
      const term = filters.search.toLowerCase();
      const matchSearch = f.toLowerCase().includes(term) || it.name?.toLowerCase().includes(term);
      const matchFac = !filters.facility || i.facility_id === filters.facility;
      const matchCat = !filters.category || it.category === filters.category;
      let matchStock = true;
      const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
      if (filters.stock === "critical") matchStock = avail <= 0;
      if (filters.stock === "low") matchStock = avail > 0 && avail < i.min_threshold;
      if (filters.stock === "available") matchStock = avail >= i.min_threshold;
      return matchSearch && matchFac && matchCat && matchStock;
    })
    .sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  function stockStatus(i: any) {
    const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
    if (avail <= 0) return { label: "Critical", cls: "border-red-200 bg-red-100 text-red-700" };
    if (avail < i.min_threshold) return { label: "Low", cls: "border-amber-200 bg-amber-100 text-amber-700" };
    return { label: "Available", cls: "border-green-200 bg-green-100 text-green-700" };
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Live Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <Card key={i} className="h-32 animate-pulse bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Inventory</h2>
          <p className="text-sm text-slate-500">Available inventory by facility and item</p>
        </div>
        <Button variant="outline" asChild size="sm"><Link href="/map">Open Map <MapPin className="ml-1 h-3 w-3" /></Link></Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search facility or item..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            <Select value={filters.facility} onValueChange={(v) => setFilters({ ...filters, facility: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All facilities</SelectItem>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.stock} onValueChange={(v) => setFilters({ ...filters, stock: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All stock</SelectItem>
                <SelectItem value="critical">Critical (0 available)</SelectItem>
                <SelectItem value="low">Low (below threshold)</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-24">Facility</TableHead>
              <TableHead className="w-24">Item</TableHead>
              <TableHead className="w-20">Category</TableHead>
              <TableHead className="w-16">On Hand</TableHead>
              <TableHead className="w-16">Reserved</TableHead>
              <TableHead className="w-16">Available</TableHead>
              <TableHead className="w-16">Min Threshold</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-20">Updated</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-400 text-sm py-4">
                  No inventory records match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => {
                const f = facilityById[i.facility_id] || i.facility_id;
                const it = itemById[i.item_id] || {};
                const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
                const status = stockStatus(i);
                const Icon = ICONS[it.category || ""] || Package;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-sm">{f}</TableCell>
                    <TableCell className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      {it.name} {it.blood_group ? <span className="text-xs font-mono text-slate-400 ml-1">({it.blood_group})</span> : null}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{it.category}</TableCell>
                    <TableCell className="text-sm font-mono">{i.quantity_on_hand}</TableCell>
                    <TableCell className="text-sm font-mono text-slate-500">{i.quantity_reserved}</TableCell>
                    <TableCell className={`text-sm font-medium ${avail <= 0 ? "text-red-600" : avail < i.min_threshold ? "text-amber-600" : "text-green-600"}`}>
                      {avail} {it.unit}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{i.min_threshold}</TableCell>
                    <TableCell>
                      <Badge className={status.cls}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">{formatRelative(i.updated_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Card className="border-t-0">
        <CardContent className="p-4">
          <p className="text-xs text-slate-500">
            Blood product quantities are planning figures only. Clinical release and compatibility remain subject to qualified medical protocols.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
