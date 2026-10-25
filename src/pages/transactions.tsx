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
import { Truck, Clock, RefreshCw, BarChart3 } from "lucide-react";
import { formatRelative, formatNumber } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  receipt: "Stock Received",
  reservation: "Stock Reserved",
  release: "Reservation Released",
  dispatch: "Stock Dispatched",
  adjustment: "Stock Adjustment",
};

const TYPE_COLORS: Record<string, string> = {
  receipt: "bg-green-100 text-green-700 border-green-200",
  reservation: "bg-amber-100 text-amber-700 border-amber-200",
  release: "bg-blue-100 text-blue-700 border-blue-200",
  dispatch: "bg-red-100 text-red-700 border-red-200",
  adjustment: "bg-slate-100 text-slate-700 border-slate-200",
};

export function TransactionsPage() {
  const { facility } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [inventories, setInventories] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_accepted", "request_dispatched", "request_delivered", "demo_reset"],
    () => {
      load();
      toast({ title: "Transactions updated", description: "New inventory transaction recorded" });
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [tx, reqs, inv, its, fs] = await Promise.all([
        api.transactions({ facility_id: facility?.id }),
        api.requests(),
        api.inventories({ facility_id: facility?.id }),
        api.items(),
        api.facilities(),
      ]);
      setTransactions(tx);
      setRequests(reqs);
      setInventories(inv);
      setItems(its);
      setFacilities(fs);
    } finally {
      setLoading(false);
    }
  }

  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const facById: Record<string, string> = {};
  facilities.forEach((f) => { facById[f.id] = f.name; });
  const invById: Record<string, any> = {};
  transactions.forEach((t) => { invById[t.inventory_id] = t; });

  // Reports
  const requestCounts: Record<string, number> = {};
  for (const r of requests) {
    requestCounts[r.item_id] = (requestCounts[r.item_id] || 0) + 1;
  }
  const topItems = Object.entries(requestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, c]) => ({ name: itemById[id]?.name || id, count: c }));

  const fulfilled = requests.filter((r) => r.status === "delivered").length;
  const total = requests.length;
  const fulfillmentRate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  const accepted = requests.filter((r) => r.accepted_at && r.created_at);
  const avgAccept = accepted.length > 0
    ? Math.round(accepted.reduce((acc, r) => acc + (new Date(r.accepted_at!).getTime() - new Date(r.created_at).getTime()), 0) / accepted.length / 1000 / 60)
    : 0;

  const dispatched = requests.filter((r) => r.dispatched_at && r.accepted_at);
  const avgDispatch = dispatched.length > 0
    ? Math.round(dispatched.reduce((acc, r) => acc + (new Date(r.dispatched_at!).getTime() - new Date(r.accepted_at!).getTime()), 0) / dispatched.length / 1000 / 60)
    : 0;

  const criticalShortages = requests.filter((r) => r.urgency === "critical").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Inventory Transactions &amp; Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Transactions &amp; Reports</h2>
          <p className="text-sm text-slate-500">Stock movement history and network reports for {facility?.name}.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Fulfillment rate</p>
                <div className="text-2xl font-bold text-slate-900">{fulfillmentRate}%</div>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mt-2">{fulfilled} of {total} requests delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Avg. acceptance time</p>
                <div className="text-2xl font-bold text-slate-900">{avgAccept} min</div>
              </div>
              <Clock className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mt-2">From request to acceptance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Avg. dispatch time</p>
                <div className="text-2xl font-bold text-slate-900">{avgDispatch} min</div>
              </div>
              <Truck className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-xs text-slate-400 mt-2">From acceptance to dispatch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Most Frequently Requested Supplies</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {topItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No request data.</p>
            ) : (
              <div className="space-y-2">
                {topItems.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{t.name}</span>
                    <span className="font-mono font-medium text-slate-900">{formatNumber(t.count)} requests</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Critical Shortage Frequency</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600">Critical requests</span>
                <span className="font-mono font-medium">{criticalShortages}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Count of requests logged with critical urgency across the network.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-16">Time</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>By</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 text-sm py-4">
                      No transactions recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => {
                    const invFacility = inventories.find((inv: any) => inv.id === t.inventory_id);
                    const item = itemById[t.inventory_id] || null;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-slate-400 font-mono">{formatRelative(t.created_at)}</TableCell>
                        <TableCell className="text-sm">{invFacility ? facById[invFacility.facility_id] || invFacility.facility_id : t.inventory_id.slice(-4)}</TableCell>
                        <TableCell className="text-sm">{item ? item.name : t.inventory_id}</TableCell>
                        <TableCell className="text-xs"><Badge className={TYPE_COLORS[t.transaction_type] || "bg-slate-100 text-slate-700"}>{TYPE_LABELS[t.transaction_type]}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{t.quantity}</TableCell>
                        <TableCell className="text-xs text-slate-400 font-mono">{t.request_id ? `#${t.request_id.slice(-4)}` : "—"}</TableCell>
                        <TableCell className="text-xs text-slate-400">{t.performed_by.slice(-4)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="p-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">Each reservation, dispatch, cancellation, and receipt is an explicit inventory transaction.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
