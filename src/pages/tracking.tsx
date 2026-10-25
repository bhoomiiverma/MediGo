"use client";

import * as React from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { formatRelative, STATUS_LABELS, URGENCY_COLORS, STATUS_ORDER } from "@/types";

export function TrackingPage() {
  const { facility } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [events, setEvents] = React.useState<Record<string, any[]>>({});
  const [items, setItems] = React.useState<any[]>([]);
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [openEvent, setOpenEvent] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState({ status: "", urgency: "", facility: "" });
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_accepted", "request_dispatched", "request_in_transit", "request_delivered", "request_rejected", "request_cancelled", "demo_reset"],
    () => {
      load();
      toast({ title: "Tracking update", description: "Request status changed" });
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [reqs, its, fs] = await Promise.all([api.requests({ facility_id: facility?.id }), api.items(), api.facilities()]);
      setItems(its);
      setFacilities(fs);
      setRequests(reqs);
    } finally {
      setLoading(false);
    }
  }

  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const facById: Record<string, string> = {};
  facilities.forEach((f) => { facById[f.id] = f.name; });

  const filtered = requests.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.urgency && r.urgency !== filters.urgency) return false;
    if (filters.facility && r.requesting_facility_id !== filters.facility && r.supplying_facility_id !== filters.facility) return false;
    return true;
  });

  async function loadEvents(id: string) {
    const ev = await api.events(id);
    setEvents((prev) => ({ ...prev, [id]: ev }));
    setOpenEvent(openEvent === id ? null : id);
  }

  function statusColor(status: string) {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-700 border-green-200";
      case "in_transit": return "bg-blue-100 text-blue-700 border-blue-200";
      case "dispatched": return "bg-blue-100 text-blue-700 border-blue-200";
      case "accepted": return "bg-amber-100 text-amber-700 border-amber-200";
      case "requested": return "bg-blue-100 text-blue-700 border-blue-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      case "cancelled": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Request Tracking</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Request Tracking</h2>
          <p className="text-sm text-slate-500">Track active and completed requests with full status history.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.urgency} onValueChange={(v) => setFilters({ ...filters, urgency: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Urgency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.facility} onValueChange={(v) => setFilters({ ...filters, facility: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Facility" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All facilities</SelectItem>
                {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => load()} variant="outline" size="sm">Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Filter className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <CardTitle className="text-sm font-medium">No requests match filters</CardTitle>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-24">Item &amp; Qty</TableHead>
                <TableHead className="w-20">Urgency</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-20">Created</TableHead>
                <TableHead className="w-20">History</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const item = itemById[r.item_id];
                const evs = events[r.id] || [];
                return (
                  <TableRow key={r.id} onClick={() => loadEvents(r.id)}>
                    <TableCell className="font-mono text-xs font-bold text-slate-500">#{r.id.slice(-4)}</TableCell>
                    <TableCell className="text-sm">{facById[r.requesting_facility_id] || r.requesting_facility_id}</TableCell>
                    <TableCell className="text-sm">{r.supplying_facility_id ? facById[r.supplying_facility_id] : "—"}</TableCell>
                    <TableCell className="text-sm">{item?.name || r.item_id} × {r.quantity_requested}</TableCell>
                    <TableCell className="text-xs">                  <Badge className={URGENCY_COLORS[r.urgency as keyof typeof URGENCY_COLORS]}>{r.urgency}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">
                      <Badge className={statusColor(r.status)}>{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">{formatRelative(r.created_at)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); loadEvents(r.id); }}>
                        {openEvent === r.id ? (evs.length > 0 ? "Hide" : "No history") : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {openEvent && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Status History</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {events[openEvent] && events[openEvent].length > 0 ? (
              <div className="space-y-3">
                {events[openEvent].map((e) => (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-slate-300 mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{STATUS_LABELS[e.new_status as keyof typeof STATUS_LABELS] || e.new_status}</span>
                        {e.previous_status && <span className="text-xs text-slate-400">from {STATUS_LABELS[e.previous_status as keyof typeof STATUS_LABELS] || e.previous_status}</span>}
                      </div>
                      <div className="text-xs text-slate-500">{e.note || ""}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatRelative(e.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No status history available.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
