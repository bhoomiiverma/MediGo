import type {
  Facility, Profile, SupplyItem, Inventory, SupplyRequest,
  InventoryTransaction, RequestEvent, Notification, DashboardStats,
  Urgency, PatientStatus, RequestStatus,
} from '@/types';
import { demoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo-store";
import { supabase } from '@/lib/supabase';

export type ApiFacility = Facility;
export type ApiProfile = Profile;

export class MedDropApi {
  private useDemo = demoMode();

  async facilities(): Promise<Facility[]> {
    if (this.useDemo) return demoStore.facilities();
    const { data, error } = await supabase!.from('facilities').select('*').eq('is_active', true).order('name');
    if (error) throw error;
    return data ?? [];
  }

  async profiles(): Promise<Profile[]> {
    if (this.useDemo) return demoStore.profiles();
    const { data, error } = await supabase!.from('profiles').select('*');
    if (error) throw error;
    return data ?? [];
  }

  async items(): Promise<SupplyItem[]> {
    if (this.useDemo) return demoStore.items();
    const { data, error } = await supabase!.from('supply_items').select('*').order('category').order('name');
    if (error) throw error;
    return data ?? [];
  }

  async inventories(filters?: { facility_id?: string }): Promise<Inventory[]> {
    if (this.useDemo) return demoStore.inventories(filters);
    const { data, error } = await supabase!.from('inventories').select('*, supply_items(*)').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...row,
      item_id: row.supply_items?.id ?? row.item_id,
    }));
  }

  async requests(filters?: { status?: RequestStatus; facility_id?: string }): Promise<SupplyRequest[]> {
    if (this.useDemo) return demoStore.requests(filters);
    let q = supabase!.from('supply_requests').select('*').order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.facility_id) q = q.or(`requesting_facility_id.eq.${filters.facility_id},supplying_facility_id.eq.${filters.facility_id}`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async transactions(filters?: { facility_id?: string }): Promise<InventoryTransaction[]> {
    if (this.useDemo) return demoStore.transactions(filters);
    let q = supabase!.from('inventory_transactions').select('*').order('created_at', { ascending: false });
    if (filters?.facility_id) {
      const { data: inv } = await supabase!.from('inventories').select('id').eq('facility_id', filters.facility_id);
      const ids = (inv ?? []).map((i: any) => i.id);
      q = q.filter('inventory_id', 'in', `(${ids.join(',')})`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async events(requestId: string): Promise<RequestEvent[]> {
    if (this.useDemo) return demoStore.events(requestId);
    const { data, error } = await supabase!.from('request_events').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async notifications(userId: string): Promise<Notification[]> {
    if (this.useDemo) return demoStore.notifications(userId);
    const { data, error } = await supabase!.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async stats(): Promise<DashboardStats> {
    if (this.useDemo) return demoStore.stats();
    const [fac, inv, req] = await Promise.all([
      supabase!.from('facilities').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase!.from('inventories').select('quantity_on_hand, quantity_reserved, min_threshold'),
      supabase!.from('supply_requests').select('status'),
    ]);
    if (fac.error) throw fac.error;
    if (inv.error) throw inv.error;
    if (req.error) throw req.error;
    const inventories = inv.data ?? [];
    const critical = inventories.filter((i: any) => Math.max(0, i.quantity_on_hand - i.quantity_reserved) <= 0).length;
    const low = inventories.filter((i: any) => {
      const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
      return avail > 0 && avail < i.min_threshold;
    }).length;
    const requests = req.data ?? [];
    const active = requests.filter((r: any) => ['requested', 'accepted', 'dispatched', 'in_transit'].includes(r.status)).length;
    const inTransit = requests.filter((r: any) => ['dispatched', 'in_transit'].includes(r.status)).length;
    const pending = requests.filter((r: any) => r.status === 'requested').length;
    return {
      total_facilities: fac.count ?? 0,
      critical_shortages: critical + low,
      active_requests: active,
      supplies_in_transit: inTransit,
      pending_acceptance: pending,
    };
  }

  async signIn(email: string, password: string) {
    if (this.useDemo) {
      const result = await demoStore.signIn(email, password);
      return result;
    }
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Login failed');
    const { data: profile, error: perr } = await supabase!.from('profiles').select('*').eq('id', data.user.id).single();
    if (perr) throw perr;
    const facility = profile.facility_id
      ? (await supabase!.from('facilities').select('*').eq('id', profile.facility_id).single()).data ?? null
      : null;
    return { profile, facility };
  }

  async signOut() {
    if (this.useDemo) return demoStore.signOut();
    const { error } = await supabase!.auth.signOut();
    if (error) throw error;
  }

  async getProfile(userId: string) {
    if (this.useDemo) return demoStore.getProfile(userId);
    const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  }

  async getFacility(id: string) {
    if (this.useDemo) return demoStore.getFacility(id);
    const { data, error } = await supabase!.from('facilities').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async createRequest(input: {
    requesting_facility_id: string;
    item_id: string;
    quantity_requested: number;
    urgency: Urgency;
    patient_status: PatientStatus;
    radius_km: number;
    notes?: string | null;
    incident_reference?: string | null;
    created_by: string;
  }) {
    if (this.useDemo) {
      const result = await demoStore.createRequest(input);
      return { request: result.request, suppliers: result.suppliers };
    }
    const { data, error } = await supabase!
      .from('supply_requests')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return { request: data, suppliers: [] };
  }

  async acceptRequest(requestId: string, actorId: string) {
    if (this.useDemo) return demoStore.acceptRequest(requestId, actorId);
    const { data: req, error } = await supabase!.rpc('accept_request', { p_request_id: requestId, p_actor_id: actorId });
    if (error) throw error;
    return req;
  }

  async rejectRequest(requestId: string, actorId: string, reason: string) {
    if (this.useDemo) return demoStore.rejectRequest(requestId, actorId, reason);
    const { data, error } = await supabase!.rpc('reject_request', { p_request_id: requestId, p_actor_id: actorId, p_reason: reason });
    if (error) throw error;
    return data;
  }

  async cancelRequest(requestId: string, actorId: string) {
    if (this.useDemo) return demoStore.cancelRequest(requestId, actorId);
    const { data, error } = await supabase!.rpc('cancel_request', { p_request_id: requestId, p_actor_id: actorId });
    if (error) throw error;
    return data;
  }

  async dispatchRequest(requestId: string, actorId: string) {
    if (this.useDemo) return demoStore.dispatchRequest(requestId, actorId);
    const { data, error } = await supabase!.rpc('dispatch_request', { p_request_id: requestId, p_actor_id: actorId });
    if (error) throw error;
    return data;
  }

  async markInTransit(requestId: string, actorId: string) {
    if (this.useDemo) return demoStore.markInTransit(requestId, actorId);
    const { data, error } = await supabase!.from('supply_requests').update({ status: 'in_transit', updated_at: new Date().toISOString() }).eq('id', requestId).select().single();
    if (error) throw error;
    return data;
  }

  async confirmDelivery(requestId: string, receiverId: string) {
    if (this.useDemo) return demoStore.confirmDelivery(requestId, receiverId);
    const { data, error } = await supabase!.rpc('confirm_delivery', { p_request_id: requestId, p_receiver_id: receiverId });
    if (error) throw error;
    return data;
  }

  async resetDemo() {
    if (!this.useDemo) throw new Error('Reset is only available in demo mode');
    return demoStore.resetDemo();
  }
}

export const api = new MedDropApi();
export { demoMode };
