"use client";

import * as React from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { formatRelative, URGENCY_COLORS, STATUS_LABELS } from "@/types";
import { Link } from "wouter";

function StatCard({ title, value, subtitle, color }: { title: string; value: number | string; subtitle: string; color: string }) {
  return (
    <Card className="bg-white border-t-2 border-transparent">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2.5">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={cn("p-2 rounded-lg", color)}>
          <AlertTriangle className="h-5 w-5" />
        </div>
      </CardHeader>
    </Card>
  );
}

function cn(...cls: string[]) { return cls.filter(Boolean).join(" "); }

export function DashboardPage() {
  const { profile, facility } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = React.useState<any>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [inventories, setInventories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_created", "request_accepted", "request_dispatched", "request_delivered", "demo_reset"],
    () => {
      load();
      toast({ title: "Live update", description: "Emergency network data changed" });
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [s, rs, fs, its, inv] = await Promise.all([
        api.stats(),
        api.requests(),
        api.facilities(),
        api.items(),
        api.inventories(),
      ]);
      setStats(s);
      setRequests(rs.slice(0, 8));
      setFacilities(fs);
      setItems(its);
      setInventories(inv);
    } finally {
      setLoading(false);
    }
  }

  const facilityById = Object.fromEntries(facilities.map((f: any) => [f.id, f.name]));
  const itemById = Object.fromEntries(items.map((i: any) => [i.id, { name: i.name, unit: i.unit }]));

  const lowStock = inventories.filter((i: any) => {
    const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
    return avail < i.min_threshold;
  }).slice(0, 6);

  const pending = requests.filter((r: any) => r.status === "requested");
  const inTransit = requests.filter((r: any) => r.status === "dispatched" || r.status === "in_transit");

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Operations Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Operations Dashboard</h2>
          <p className="text-sm text-slate-500">
            Facility: <span className="font-medium">{facility?.name}</span> &bull; Role: <span className="font-medium capitalize">{profile?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm"><Link href="/inventory">Live Inventory</Link></Button>
          <Button variant="destructive" asChild size="sm"><Link href="/request">Request Emergency Supply</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Registered Facilities" value={stats.total_facilities} subtitle="Active in network" color="bg-blue-100 text-blue-600" />
        <StatCard title="Critical Shortages" value={stats.critical_shortages} subtitle="Items below threshold" color="bg-red-100 text-red-600" />
        <StatCard title="Active Requests" value={stats.active_requests} subtitle="Open emergency requests" color="bg-amber-100 text-amber-600" />
        <StatCard title="Supplies In Transit" value={stats.supplies_in_transit} subtitle="Dispatched, not delivered" color="bg-blue-100 text-blue-600" />
        <StatCard title="Awaiting Acceptance" value={stats.pending_acceptance} subtitle="Requests not yet accepted" color="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Recent Emergency Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent requests.</p>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead className="w-20">Urgency</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead className="w-16">Time</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono text-slate-500">#{r.id.slice(-4)}</TableCell>
                      <TableCell className="text-xs font-medium">{facilityById[r.requesting_facility_id] || r.requesting_facility_id}</TableCell>
                      <TableCell className="text-xs">                      <Badge className={URGENCY_COLORS[r.urgency as keyof typeof URGENCY_COLORS]}>{r.urgency}</Badge></TableCell>
                      <TableCell className="text-xs">{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatRelative(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="p-3 border-t border-slate-100">
            <Button variant="outline" size="sm" asChild className="w-full"><Link href="/tracking">View all requests <ChevronRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardFooter>
        </Card>

        <Card className="h-full">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Low-Stock Warnings</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {lowStock.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No low-stock warnings.</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((i) => {
                  const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
                  const item = itemById[i.item_id] || { name: i.item_id, unit: "" };
                  return (
                    <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="text-sm">{item.name}</div>
                      <div className="text-right text-xs">
                        <div className="font-medium text-slate-900">{avail} {item.unit}</div>
                        <div className="text-[10px] text-red-600 font-medium">Below threshold</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Critical & High-Priority Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {pending.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No requests awaiting acceptance.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((r) => {
                  const item = itemById[r.item_id] || { name: r.item_id, unit: "" };
                  return (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="text-sm font-medium">{item.name} × {r.quantity_requested}</div>
                      <div className="text-right text-xs">
                        <Badge className={URGENCY_COLORS[r.urgency as keyof typeof URGENCY_COLORS]}>{r.urgency}</Badge>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRelative(r.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Recent Dispatch Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {inTransit.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No dispatches in transit.</p>
            ) : (
              <div className="space-y-2">
                {inTransit.map((r) => {
                  const item = itemById[r.item_id] || { name: r.item_id, unit: "" };
                  return (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="text-sm">{item.name}</div>
                      <div className="text-right text-xs">
                        <div className="font-medium text-slate-900">{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
