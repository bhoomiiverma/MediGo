"use client";

import * as React from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RefreshCw, Volume2, VolumeX, Loader2, MapPin as MapPinIcon } from "lucide-react";
import { formatDistance, formatRelative, URGENCY_COLORS } from "@/types";
import { Separator } from "@/components/ui/separator";

function cn(...cls: string[]) { return cls.filter(Boolean).join(" "); }

const URGENCY_SORT: Record<string, number> = { critical: 0, high: 1, moderate: 2 };

export function AlertsPage() {
  const { profile, facility } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [newAlert, setNewAlert] = React.useState<any>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  }, []);

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["request_created", "request_accepted", "request_rejected", "request_cancelled", "demo_reset"],
    (event) => {
      if (event.type === "request_created") load();
      if (event.type === "demo_reset") load();
      if (event.type === "request_created" && soundEnabled) {
        try { audioRef.current?.play(); } catch {}
        setNewAlert(event.payload as any);
        setTimeout(() => setNewAlert(null), 6000);
      }
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [reqs, fs, its] = await Promise.all([api.requests(), api.facilities(), api.items()]);
      const myFacility = fs.find((f: any) => f.id === facility?.id);
      const list = reqs.filter((r: any) => r.status === "requested").map((r: any) => {
        const reqFac = fs.find((f: any) => f.id === r.requesting_facility_id);
        const item = its.find((i: any) => i.id === r.item_id);
        let distance: number | null = null;
        if (myFacility && reqFac) {
          const toRad = (v: number) => (v * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(reqFac.latitude - myFacility.latitude);
          const dLon = toRad(reqFac.longitude - myFacility.longitude);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(myFacility.latitude)) * Math.cos(toRad(reqFac.latitude)) * Math.sin(dLon / 2) ** 2;
          distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return { ...r, requesting_facility_name: reqFac?.name, item_name: item?.name, item_unit: item?.unit, distance_km: distance };
      });
      list.sort((a, b) => {
        const sa = URGENCY_SORT[a.urgency] ?? 9;
        const sb = URGENCY_SORT[b.urgency] ?? 9;
        if (sa !== sb) return sa - sb;
        return a.created_at.localeCompare(b.created_at);
      });
      setAlerts(list);
    } finally {
      setLoading(false);
    }
  }

  async function accept(id: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.acceptRequest(id, profile!.id);
      await load();
      toast({ title: "Request accepted", description: "Stock reserved and requester notified." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Accept failed", description: err?.message || "Unable to accept request" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  async function reject(id: string, reason: string) {
    setSubmitting({ ...submitting, [id]: true });
    try {
      await api.rejectRequest(id, profile!.id, reason);
      await load();
      setShowReject(false);
      setRejectId(null);
      setRejectReason("");
      toast({ title: "Request rejected", description: "Requesting facility notified." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reject failed", description: err?.message || "Unable to reject request" });
    } finally {
      setSubmitting({ ...submitting, [id]: false });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Incoming Alerts</h2>
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
          <h2 className="text-2xl font-bold text-slate-900">Incoming Alerts Board</h2>
          <p className="text-sm text-slate-500">Emergency requests awaiting your facility&rsquo;s decision. Sorted by urgency, then age.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="ml-1 text-xs">{soundEnabled ? "Sound on" : "Sound off"}</span>
          </Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <CardTitle className="text-sm font-medium">No pending alerts</CardTitle>
            <p className="text-xs text-slate-500 mt-1">No emergency requests are awaiting acceptance from {facility?.name}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={cn("border-l-4", a.urgency === "critical" ? "border-red-500 bg-red-50/40" : a.urgency === "high" ? "border-amber-500 bg-amber-50/40" : "border-blue-500 bg-blue-50/40")}>
              <div className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{a.id.slice(-4)}</span>
                    <Badge className={URGENCY_COLORS[a.urgency as keyof typeof URGENCY_COLORS]}>
                      {a.urgency.toUpperCase()} {a.urgency === "critical" ? "EMERGENCY" : ""}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-slate-500">{formatRelative(a.created_at)}</div>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Requesting facility</div>
                    <div className="font-medium">{a.requesting_facility_name || a.requesting_facility_id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Item &amp; quantity</div>
                    <div className="font-medium">{a.item_name || a.item_id} × {a.quantity_requested} {a.item_unit || ""}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Patient status</div>
                    <div className="font-medium capitalize">{a.patient_status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Available at your hub</div>
                    <div className="font-mono font-medium" title="Available stock computed at acceptance time">—</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <MapPinIcon className="mr-1 h-3.5 w-3.5 inline" /> {a.distance_km ? formatDistance(a.distance_km) : "Distance n/a"}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(a.id)} disabled={submitting[a.id]} className="bg-green-600 hover:bg-green-700">
                      {submitting[a.id] ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectId(a.id); setShowReject(true); }}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showReject} onOpenChange={(open) => { if (!open) setShowReject(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>A reason is required so the requesting facility can adjust its response.</DialogDescription>
          </DialogHeader>
          <Separator className="my-4" />
          <form onSubmit={(e) => { e.preventDefault(); reject(rejectId!, rejectReason); }}>
            <div className="space-y-2">
              <Label>Reason for rejection</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={submitting[rejectId || ""]}>
                Reject Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {newAlert && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800 shadow-lg animate-pulse">
          <AlertTriangle className="h-5 w-5 animate-spin" />
          <div className="text-sm font-medium">New critical request from {newAlert.requesting_facility_name}</div>
        </div>
      )}
    </div>
  );
}

