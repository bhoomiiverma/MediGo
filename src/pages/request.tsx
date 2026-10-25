"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { formatDistance } from "@/types";
import { Separator } from "@/components/ui/separator";

const requestSchema = z.object({
  item_id: z.string({ message: "Select a medical supply" }),
  quantity_requested: z.coerce.number().int().positive({ message: "Quantity must be at least 1" }),
  urgency: z.enum(["critical", "high", "moderate"], { message: "Select an urgency" }),
  patient_status: z.enum(["incoming", "on_site", "stabilized"], { message: "Select a patient status" }),
  radius_km: z.coerce.number().positive({ message: "Radius must be greater than 0" }),
  notes: z.string().optional(),
  incident_reference: z.string().optional(),
});

export function RequestPage() {
  const { profile, facility } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [showMatch, setShowMatch] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [createdRequest, setCreatedRequest] = React.useState<any>(null);
  const [matchError, setMatchError] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { urgency: "critical", patient_status: "incoming", radius_km: 25, quantity_requested: 1 },
  });

  React.useEffect(() => {
    api.items().then(setItems);
  }, []);

  async function onSubmit(values: z.infer<typeof requestSchema>) {
    if (!facility) return;
    setSubmitting(true);
    setMatchError("");
    try {
      const result = await api.createRequest({
        requesting_facility_id: facility.id,
        item_id: values.item_id,
        quantity_requested: values.quantity_requested,
        urgency: values.urgency,
        patient_status: values.patient_status,
        radius_km: values.radius_km,
        notes: values.notes || null,
        incident_reference: values.incident_reference || null,
        created_by: profile!.id,
      });
      setCreatedRequest(result.request);
      setSuppliers(result.suppliers || []);
      setShowMatch(true);
      setDialogOpen(true);
      toast({ title: "Request submitted", description: `Emergency request #${result.request.id.slice(-4)} created. Eligible suppliers are being notified.` });
    } catch (err: any) {
      setMatchError(err?.message || "Failed to create request");
      toast({ variant: "destructive", title: "Request failed", description: err?.message || "Unable to submit request" });
    } finally {
      setSubmitting(false);
    }
  }

  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Request Emergency Supply</h2>
          <p className="text-sm text-slate-500">Submit an emergency supply request to nearby supplying facilities.</p>
        </div>
        <Button variant="destructive" onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" /> New Request
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Emergency Supply</DialogTitle>
            <DialogDescription>
              Complete the form to alert nearby supplying facilities. Critical requests are prioritized in the incoming alerts board.
            </DialogDescription>
          </DialogHeader>
          <Separator className="my-4" />
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Medical supply</Label>
                <Select {...form.register("item_id")} onValueChange={(v) => form.setValue("item_id", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.unit}){i.blood_group ? ` · ${i.blood_group}` : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.item_id && <span className="text-xs text-red-600">{form.formState.errors.item_id.message}</span>}
              </div>
              <div className="space-y-2">
                <Label>Quantity requested</Label>
                <Input type="number" {...form.register("quantity_requested")} placeholder="1" min="1" />
                {form.formState.errors.quantity_requested && <span className="text-xs text-red-600">{form.formState.errors.quantity_requested.message}</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select {...form.register("urgency")} onValueChange={(v) => form.setValue("urgency", v as any)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select urgency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Patient arrival status</Label>
                <Select {...form.register("patient_status")} onValueChange={(v) => form.setValue("patient_status", v as any)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="on_site">On site</SelectItem>
                    <SelectItem value="stabilized">Stabilized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search radius (km)</Label>
                <Input type="number" {...form.register("radius_km")} placeholder="25" min="1" step="1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input {...form.register("notes")} placeholder="Additional context for supplying facility" />
            </div>
            <div className="space-y-2">
              <Label>Incident reference (optional)</Label>
              <Input {...form.register("incident_reference")} placeholder="INC-2024-001" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showMatch && createdRequest && (
        <Card className="border-l-4 border-red-500 bg-red-50/30">
          <CardHeader className="p-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <CardTitle className="text-sm font-bold text-red-800">Request Created — Supplier Matching</CardTitle>
                <CardDescription className="text-xs text-red-700">Eligible supplying facilities have been notified in real time.</CardDescription>
              </div>
            </div>
            <Badge className="bg-red-100 text-red-700 border-red-200">{createdRequest.urgency.toUpperCase()}</Badge>
          </CardHeader>
          <CardContent className="p-4">
            {matchError && (
              <div className="p-3 rounded-lg border border-red-100 bg-red-50 text-red-700 text-sm">{matchError}</div>
            )}
            {!matchError && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Request #{createdRequest.id.slice(-4)} · {createdRequest.quantity_requested} x {itemById[createdRequest.item_id]?.name}</p>
                <p className="text-xs text-slate-500">Suppliers within {createdRequest.radius_km} km with sufficient stock:</p>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Facility</TableHead>
                      <TableHead className="w-24">Available</TableHead>
                      <TableHead className="w-20">Distance</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length > 0 ? (
                      suppliers.map((s) => (
                        <TableRow key={s.facility.id}>
                          <TableCell className="font-medium text-sm">{s.facility.name}</TableCell>
                          <TableCell className="text-sm font-mono">{s.available} {itemById[createdRequest.item_id]?.unit}</TableCell>
                          <TableCell className="text-sm font-mono">{formatDistance(s.dist)}</TableCell>
                          <TableCell><Badge className="border-green-200 bg-green-100 text-green-700">Can fulfill</Badge></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-400 text-sm py-4">No suppliers within range can fulfill this quantity.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <p className="text-xs text-slate-500 mt-2">Suppliers may accept or reject this request from their Incoming Alerts board.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">How it works</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <div className="text-sm font-medium">Select supply, quantity, and urgency</div>
              <div className="text-xs text-slate-500">Choose the item, quantity, urgency level, and patient arrival status.</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <div className="text-sm font-medium">Set your service radius</div>
              <div className="text-xs text-slate-500">Eligible facilities within range that can fulfill the quantity are identified automatically.</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <div className="text-sm font-medium">Suppliers are notified in real time</div>
              <div className="text-xs text-slate-500">Nearby hubs receive an alert and can accept or reject the request.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
