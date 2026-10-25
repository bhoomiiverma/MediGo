"use client";

import * as React from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Truck } from "lucide-react";
import { formatRelative, STATUS_LABELS, URGENCY_COLORS } from "@/types";

function cn(...cls: string[]) { return cls.filter(Boolean).join(" "); }

const STEP_ORDER: string[] = ["requested", "accepted", "dispatched", "in_transit", "delivered"];

export function DispatchPage() {
  const { profile, facility } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showReject, setShowReject] = React.useState(false);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_accepted", "request_dispatched", "request_in_transit", "request_delivered", "request_rejected", "request_cancelled", "demo_reset"],
    () => {
      load();
      toast({ title: "Dispatch update", description: "Request status changed" });
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
  (facilities ?? []).forEach((f) => { facById[f.id] = f.name; });

  const isSupplier = profile?.role === "supplier" || profile?.role === "administrator";

  async function accept(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.acceptRequest(id, profile!.id);
      await load();
      toast({ title: "Accepted", description: "Stock reserved and requester notified in real time." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Accept failed", description: err?.message || "Unable to accept" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  async function reject(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.rejectRequest(id, profile!.id, rejectReason);
      await load();
      setShowReject(false);
      setRejectId(null);
      setRejectReason("");
      toast({ title: "Rejected", description: "Requesting facility notified." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reject failed", description: err?.message || "Unable to reject" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  async function dispatch(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.dispatchRequest(id, profile!.id);
      await load();
      toast({ title: "Dispatched", description: "Inventory deducted. Requester notified." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Dispatch failed", description: err?.message || "Unable to dispatch" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  async function inTransit(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.markInTransit(id, profile!.id);
      await load();
      toast({ title: "In Transit", description: "Supplies are on the way." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err?.message || "Unable to update" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  async function deliver(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.confirmDelivery(id, profile!.id);
      await load();
      toast({ title: "Delivered", description: "Delivery confirmed and audit event recorded." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Confirm failed", description: err?.message || "Unable to confirm delivery" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  function stepIndex(status: string) {
    return STEP_ORDER.indexOf(status);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Dispatch Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-48 animate-pulse bg-slate-100" />)}
        </div>
      </div>
    );
  }

  const myRequests = requests.filter((r) => {
    if (isSupplier) return r.supplying_facility_id === facility?.id || r.status === "requested";
    return r.requesting_facility_id === facility?.id;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dispatch Management</h2>
          <p className="text-sm text-slate-500">Request lifecycle: Requested &rarr; Accepted &rarr; Dispatched &rarr; In Transit &rarr; Delivered</p>
        </div>
      </div>

      {myRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <CardTitle className="text-sm font-medium">No dispatches</CardTitle>
            <p className="text-xs text-slate-500 mt-1">No requests assigned to or from {facility?.name}.</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>From &rarr; To</TableHead>
              <TableHead className="w-24">Item &amp; Qty</TableHead>
              <TableHead className="w-20">Urgency</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-20">Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {myRequests.map((r) => {
              const item = itemById[r.item_id];
              const idx = stepIndex(r.status);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-slate-500">#{r.id.slice(-4)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{facById[r.requesting_facility_id] || r.requesting_facility_id}</div>
                    <div className="text-xs text-slate-500">{r.supplying_facility_id ? facById[r.supplying_facility_id] : "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{item?.name || r.item_id} × {r.quantity_requested} {item?.unit || ""}</TableCell>
                  <TableCell className="text-xs">                  <Badge className={URGENCY_COLORS[r.urgency as keyof typeof URGENCY_COLORS]}>{r.urgency}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex gap-1">
                      {STEP_ORDER.map((s, i) => (
                        <span
                          key={s}
                          className={cn("h-2 w-2 rounded-full transition-colors", i < idx ? "bg-green-600" : i === idx ? "bg-blue-600" : "bg-slate-200")}
                          title={STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">{formatRelative(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "requested" && isSupplier && r.supplying_facility_id === facility?.id && (
                        <>
                          <Button size="sm" onClick={() => accept(r.id)} disabled={submitting[r.id]} className="bg-green-600 hover:bg-green-700 text-xs">
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setShowReject(true); }} disabled={submitting[r.id]} className="text-xs">
                            Reject
                          </Button>
                        </>
                      )}
                      {r.status === "accepted" && isSupplier && r.supplying_facility_id === facility?.id && (
                        <Button size="sm" onClick={() => dispatch(r.id)} disabled={submitting[r.id]} className="bg-blue-600 hover:bg-blue-700 text-xs">
                          Dispatch
                        </Button>
                      )}
                      {r.status === "dispatched" && isSupplier && r.supplying_facility_id === facility?.id && (
                        <Button size="sm" onClick={() => inTransit(r.id)} disabled={submitting[r.id]} className="bg-amber-600 hover:bg-amber-700 text-xs">
                          In Transit
                        </Button>
                      )}
                      {r.status === "in_transit" && r.requesting_facility_id === facility?.id && (
                        <Button size="sm" onClick={() => deliver(r.id)} disabled={submitting[r.id]} className="bg-green-600 hover:bg-green-700 text-xs">
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={showReject} onOpenChange={(open) => { if (!open) setShowReject(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason for the requesting facility.</DialogDescription>
          </DialogHeader>
          <Separator className="my-4" />
          <form onSubmit={(e) => { e.preventDefault(); reject(rejectId!); }}>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={submitting[rejectId || ""]}>
                Reject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
