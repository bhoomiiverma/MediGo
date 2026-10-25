import type {
  Facility,
  Profile,
  SupplyItem,
  Inventory,
  SupplyRequest,
  InventoryTransaction,
  RequestEvent,
  Notification,
  DashboardStats,
  Urgency,
  PatientStatus,
  RequestStatus,
} from '@/types';

export interface SupplierMatch {
  facility: Facility;
  available: number;
  inventoryId: string;
  dist: number;
}

const LATENCY_MS = 400;

function delay(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowISO() {
  return new Date().toISOString();
}

const FACILITIES: Facility[] = [
  {
    id: 'fac-alpha',
    name: 'Outpost Alpha',
    type: 'outpost',
    latitude: 28.6139,
    longitude: 77.209,
    address: 'Forward operating outpost, Sector 7',
    region: 'Northern Border Zone',
    is_active: true,
    created_at: nowISO(),
  },
  {
    id: 'fac-base',
    name: 'Sector Base Hospital',
    type: 'base hospital',
    latitude: 28.65,
    longitude: 77.25,
    address: 'Main base hospital, Sector Command',
    region: 'Northern Border Zone',
    is_active: true,
    created_at: nowISO(),
  },
  {
    id: 'fac-bravo',
    name: 'Relief Camp Bravo',
    type: 'relief camp',
    latitude: 28.58,
    longitude: 77.15,
    address: 'Disaster relief camp, Grid 12',
    region: 'Northern Border Zone',
    is_active: true,
    created_at: nowISO(),
  },
];

const PROFILES: Profile[] = [
  {
    id: 'user-alpha',
    full_name: 'Lt. Maya Sharma',
    role: 'requester',
    facility_id: 'fac-alpha',
    created_at: nowISO(),
  },
  {
    id: 'user-base',
    full_name: 'Capt. Arjun Mehta',
    role: 'supplier',
    facility_id: 'fac-base',
    created_at: nowISO(),
  },
  {
    id: 'user-bravo',
    full_name: 'Medic Priya Nair',
    role: 'requester',
    facility_id: 'fac-bravo',
    created_at: nowISO(),
  },
  {
    id: 'user-admin',
    full_name: 'Admin Commander',
    role: 'administrator',
    facility_id: null,
    created_at: nowISO(),
  },
];

const ITEMS: SupplyItem[] = [
  { id: 'item-oneg', name: 'O-Negative Blood', category: 'Blood Products', unit: 'units', blood_group: 'O-', is_blood_product: true, created_at: nowISO() },
  { id: 'item-apos', name: 'A-Positive Blood', category: 'Blood Products', unit: 'units', blood_group: 'A+', is_blood_product: true, created_at: nowISO() },
  { id: 'item-bneg', name: 'B-Negative Blood', category: 'Blood Products', unit: 'units', blood_group: 'B-', is_blood_product: true, created_at: nowISO() },
  { id: 'item-antivenom', name: 'Snake Antivenom', category: 'Antidotes', unit: 'vials', blood_group: null, is_blood_product: false, created_at: nowISO() },
  { id: 'item-trauma', name: 'Trauma Kit', category: 'Trauma', unit: 'kits', blood_group: null, is_blood_product: false, created_at: nowISO() },
  { id: 'item-burn', name: 'Burn Dressing', category: 'Wound Care', unit: 'packs', blood_group: null, is_blood_product: false, created_at: nowISO() },
  { id: 'item-tourniquet', name: 'Tourniquet', category: 'Trauma', unit: 'units', blood_group: null, is_blood_product: false, created_at: nowISO() },
  { id: 'item-paracetamol', name: 'Paracetamol 500mg', category: 'Medicines', unit: 'tablets', blood_group: null, is_blood_product: false, created_at: nowISO() },
];

const INVENTORIES: Inventory[] = [
  { id: 'inv-alpha-oneg', facility_id: 'fac-alpha', item_id: 'item-oneg', quantity_on_hand: 0, quantity_reserved: 0, min_threshold: 5, updated_at: nowISO() },
  { id: 'inv-alpha-antivenom', facility_id: 'fac-alpha', item_id: 'item-antivenom', quantity_on_hand: 3, quantity_reserved: 0, min_threshold: 5, updated_at: nowISO() },
  { id: 'inv-alpha-trauma', facility_id: 'fac-alpha', item_id: 'item-trauma', quantity_on_hand: 4, quantity_reserved: 0, min_threshold: 3, updated_at: nowISO() },
  { id: 'inv-base-oneg', facility_id: 'fac-base', item_id: 'item-oneg', quantity_on_hand: 10, quantity_reserved: 0, min_threshold: 8, updated_at: nowISO() },
  { id: 'inv-base-antivenom', facility_id: 'fac-base', item_id: 'item-antivenom', quantity_on_hand: 12, quantity_reserved: 0, min_threshold: 6, updated_at: nowISO() },
  { id: 'inv-base-trauma', facility_id: 'fac-base', item_id: 'item-trauma', quantity_on_hand: 12, quantity_reserved: 0, min_threshold: 10, updated_at: nowISO() },
  { id: 'inv-base-burn', facility_id: 'fac-base', item_id: 'item-burn', quantity_on_hand: 15, quantity_reserved: 0, min_threshold: 8, updated_at: nowISO() },
  { id: 'inv-base-tourniquet', facility_id: 'fac-base', item_id: 'item-tourniquet', quantity_on_hand: 20, quantity_reserved: 0, min_threshold: 10, updated_at: nowISO() },
  { id: 'inv-bravo-burn', facility_id: 'fac-bravo', item_id: 'item-burn', quantity_on_hand: 8, quantity_reserved: 0, min_threshold: 5, updated_at: nowISO() },
  { id: 'inv-bravo-trauma', facility_id: 'fac-bravo', item_id: 'item-trauma', quantity_on_hand: 6, quantity_reserved: 0, min_threshold: 5, updated_at: nowISO() },
];

const REQUESTS: SupplyRequest[] = [];
const TRANSACTIONS: InventoryTransaction[] = [];
const EVENTS: RequestEvent[] = [];
const NOTIFICATIONS: Notification[] = [];

function findInventory(facilityId: string, itemId: string) {
  return INVENTORIES.find((i) => i.facility_id === facilityId && i.item_id === itemId);
}

function availableQty(inventory: Inventory) {
  return Math.max(0, inventory.quantity_on_hand - inventory.quantity_reserved);
}

function stockStatus(inventory: Inventory): 'critical' | 'low' | 'available' {
  if (availableQty(inventory) <= 0) return 'critical';
  if (availableQty(inventory) < inventory.min_threshold) return 'low';
  return 'available';
}

function emitRequestEvent(
  requestId: string,
  previous: string | null,
  next: string,
  actorId: string,
  note: string | null,
) {
  const event: RequestEvent = {
    id: uuid(),
    request_id: requestId,
    previous_status: previous,
    new_status: next,
    actor_id: actorId,
    note,
    created_at: nowISO(),
  };
  EVENTS.push(event);
  return event;
}

function createNotification(userId: string, type: Notification['type'], title: string, message: string, link?: string, data?: Record<string, unknown>) {
  const n: Notification = {
    id: uuid(),
    user_id: userId,
    type,
    title,
    message,
    read: false,
    created_at: nowISO(),
    link: link ?? null,
    data: data ?? null,
  };
  NOTIFICATIONS.push(n);
  return n;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SupplierMatch {
  facility: Facility;
  available: number;
  inventoryId: string;
  dist: number;
}

export interface DemoStore {
  facilities: () => Promise<Facility[]>;
  profiles: () => Promise<Profile[]>;
  items: () => Promise<SupplyItem[]>;
  inventories: (filters?: { facility_id?: string }) => Promise<Inventory[]>;
  requests: (filters?: { status?: RequestStatus; facility_id?: string }) => Promise<SupplyRequest[]>;
  transactions: (filters?: { facility_id?: string }) => Promise<InventoryTransaction[]>;
  events: (requestId: string) => Promise<RequestEvent[]>;
  notifications: (userId: string) => Promise<Notification[]>;
  stats: () => Promise<DashboardStats>;
  signIn: (email: string, password: string) => Promise<{ profile: Profile; facility: Facility | null }>;
  signOut: () => Promise<void>;
  getProfile: (userId: string) => Promise<Profile | null>;
  getFacility: (id: string) => Promise<Facility | null>;
  createRequest: (input: {
    requesting_facility_id: string;
    item_id: string;
    quantity_requested: number;
    urgency: Urgency;
    patient_status: PatientStatus;
    radius_km: number;
    notes?: string | null;
    incident_reference?: string | null;
    created_by: string;
  }) => Promise<{ request: SupplyRequest; suppliers: SupplierMatch[] }>;
  acceptRequest: (requestId: string, actorId: string) => Promise<SupplyRequest>;
  rejectRequest: (requestId: string, actorId: string, reason: string) => Promise<SupplyRequest>;
  cancelRequest: (requestId: string, actorId: string) => Promise<SupplyRequest>;
  dispatchRequest: (requestId: string, actorId: string) => Promise<SupplyRequest>;
  markInTransit: (requestId: string, actorId: string) => Promise<SupplyRequest>;
  confirmDelivery: (requestId: string, receiverId: string) => Promise<SupplyRequest>;
  resetDemo: () => Promise<void>;
  subscribe: (channels: string[], handler: (event: { type: string; payload: unknown }) => void) => () => void;
}

export function createDemoStore(): DemoStore {
  let listeners: Array<(event: { type: string; payload: unknown }) => void> = [];
  const acceptMutex = { held: false };
  const dispatchMutex = { held: false };

  async function withLock<T>(mutex: { held: boolean }, work: () => Promise<T>): Promise<T> {
    while (mutex.held) await new Promise((resolve) => setTimeout(resolve, 1));
    mutex.held = true;
    try {
      return await work();
    } finally {
      mutex.held = false;
    }
  }

  function broadcast(type: string, payload: unknown) {
    for (const listener of listeners) {
      try { listener({ type, payload }); } catch {}
    }
  }

  return {
    async facilities() {
      await delay();
      return [...FACILITIES];
    },
    async profiles() {
      await delay();
      return [...PROFILES];
    },
    async items() {
      await delay();
      return [...ITEMS];
    },
    async inventories(filters) {
      await delay();
      let list = [...INVENTORIES];
      if (filters?.facility_id) list = list.filter((i) => i.facility_id === filters.facility_id);
      return list;
    },
    async requests(filters) {
      await delay();
      let list = [...REQUESTS];
      if (filters?.status) list = list.filter((r) => r.status === filters.status);
      if (filters?.facility_id) {
        list = list.filter((r) => r.requesting_facility_id === filters.facility_id || r.supplying_facility_id === filters.facility_id);
      }
      return list;
    },
    async transactions(filters) {
      await delay();
      let list = [...TRANSACTIONS];
      if (filters?.facility_id) {
        const invIds = new Set(INVENTORIES.filter((i) => i.facility_id === filters!.facility_id).map((i) => i.id));
        list = list.filter((t) => invIds.has(t.inventory_id));
      }
      return list;
    },
    async events(requestId) {
      await delay(150);
      return EVENTS.filter((e) => e.request_id === requestId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async notifications(userId) {
      await delay(150);
      return NOTIFICATIONS.filter((n) => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async stats() {
      await delay();
      const facilities = FACILITIES.filter((f) => f.is_active).length;
      const inventories = await this.inventories();
      const critical = inventories.filter((i) => stockStatus(i) === 'critical').length;
      const active = REQUESTS.filter((r) => r.status === 'requested' || r.status === 'accepted' || r.status === 'dispatched' || r.status === 'in_transit').length;
      const inTransit = REQUESTS.filter((r) => r.status === 'dispatched' || r.status === 'in_transit').length;
      const pending = REQUESTS.filter((r) => r.status === 'requested').length;
      return { total_facilities: facilities, critical_shortages: critical, active_requests: active, supplies_in_transit: inTransit, pending_acceptance: pending };
    },
    async signIn(email, password) {
      await delay(500);
      const normalized = email.toLowerCase().trim();
      let profile: Profile | null = null;
      if (normalized === 'alpha@meddrop.demo' || normalized === 'outpost@meddrop.demo') profile = PROFILES.find((p) => p.id === 'user-alpha')!;
      else if (normalized === 'base@meddrop.demo' || normalized === 'hospital@meddrop.demo') profile = PROFILES.find((p) => p.id === 'user-base')!;
      else if (normalized === 'bravo@meddrop.demo' || normalized === 'camp@meddrop.demo') profile = PROFILES.find((p) => p.id === 'user-bravo')!;
      else if (normalized === 'admin@meddrop.demo') profile = PROFILES.find((p) => p.id === 'user-admin')!;
      else throw new Error('Invalid demo credentials. Use alpha@meddrop.demo, base@meddrop.demo, bravo@meddrop.demo, or admin@meddrop.demo');

      if (password !== 'MedDrop123!') throw new Error('Invalid password. Demo password is MedDrop123!');
      const facility = profile.facility_id ? FACILITIES.find((f) => f.id === profile.facility_id) ?? null : null;
      return { profile, facility };
    },
    async signOut() {
      await delay(100);
      return;
    },
    async getProfile(userId) {
      await delay(100);
      return PROFILES.find((p) => p.id === userId) ?? null;
    },
    async getFacility(id) {
      await delay(100);
      return FACILITIES.find((f) => f.id === id) ?? null;
    },
    async createRequest(input) {
      await delay(600);
      const requesting = FACILITIES.find((f) => f.id === input.requesting_facility_id);
      if (!requesting) throw new Error('Requesting facility not found');
      const item = ITEMS.find((i) => i.id === input.item_id);
      if (!item) throw new Error('Supply item not found');

      const suppliers: SupplierMatch[] = [];
      const now = Date.now();
      const duplicate = REQUESTS.find((r) =>
        r.requesting_facility_id === input.requesting_facility_id &&
        r.item_id === input.item_id &&
        r.status === 'requested' &&
        now - new Date(r.created_at).getTime() < 5 * 60 * 1000
      );
      if (duplicate) return { request: duplicate, suppliers: [] };
      for (const fac of FACILITIES) {
        if (fac.id === input.requesting_facility_id || !fac.is_active) continue;
        const inv = findInventory(fac.id, input.item_id);
        if (!inv) continue;
        const avail = availableQty(inv);
        if (avail < input.quantity_requested) continue;
        const dist = distanceKm(requesting.latitude, requesting.longitude, fac.latitude, fac.longitude);
        if (dist > input.radius_km) continue;
        suppliers.push({ facility: fac, available: avail, inventoryId: inv.id, dist });
      }
      suppliers.sort((a, b) => a.dist - b.dist);
      if (suppliers.length === 0) throw new Error('No supplying facility within range can fulfill this quantity.');

      const request: SupplyRequest = {
        id: uuid(),
        requesting_facility_id: input.requesting_facility_id,
        supplying_facility_id: null,
        item_id: input.item_id,
        quantity_requested: input.quantity_requested,
        urgency: input.urgency,
        patient_status: input.patient_status,
        radius_km: input.radius_km,
        notes: input.notes ?? null,
        incident_reference: input.incident_reference ?? null,
        status: 'requested',
        created_by: input.created_by,
        created_at: nowISO(),
        updated_at: nowISO(),
        accepted_at: null,
        dispatched_at: null,
        delivered_at: null,
      };
      REQUESTS.push(request);
      emitRequestEvent(request.id, null, 'requested', input.created_by, `Emergency request created for ${input.quantity_requested} x ${item.name}.`);

      for (const sup of suppliers) {
        const members = PROFILES.filter((p) => p.facility_id === sup.facility.id && p.role !== 'administrator');
        for (const m of members) {
          createNotification(m.id, 'new_request', 'New Emergency Request', `${requesting.name} requests ${input.quantity_requested} x ${item.name} (${input.urgency}).`, `/alerts`, { requestId: request.id });
        }
      }
      broadcast('request_created', request);
      return { request, suppliers };
    },
    async acceptRequest(requestId, actorId) {
      return withLock(acceptMutex, async () => {
        await delay(500);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'requested') throw new Error('Only requested supplies can be accepted');
      const actor = PROFILES.find((p) => p.id === actorId);
      if (!actor || !actor.facility_id) throw new Error('Actor must belong to a facility');
      const supplyingFac = FACILITIES.find((f) => f.id === actor.facility_id);
      if (!supplyingFac) throw new Error('Supplying facility not found');

      const inv = findInventory(actor.facility_id, req.item_id);
      if (!inv) throw new Error('No inventory record for this item at your facility');
      if (availableQty(inv) < req.quantity_requested) throw new Error('Insufficient stock to accept this request');

      const requestingFac = FACILITIES.find((f) => f.id === req.requesting_facility_id);
      const dist = distanceKm(requestingFac!.latitude, requestingFac!.longitude, supplyingFac.latitude, supplyingFac.longitude);

      // Atomic reservation
      inv.quantity_reserved += req.quantity_requested;
      inv.updated_at = nowISO();

      const prev = req.status;
      req.supplying_facility_id = actor.facility_id;
      req.status = 'accepted';
      req.updated_at = nowISO();
      req.accepted_at = nowISO();

      const tx: InventoryTransaction = {
        id: uuid(),
        inventory_id: inv.id,
        request_id: req.id,
        transaction_type: 'reservation',
        quantity: req.quantity_requested,
        performed_by: actorId,
        created_at: nowISO(),
        notes: `Reserved for request ${req.id}`,
      };
      TRANSACTIONS.push(tx);
      emitRequestEvent(req.id, prev, 'accepted', actorId, `Accepted by ${supplyingFac.name}. ${req.quantity_requested} units reserved.`);

      const requesterProfiles = PROFILES.filter((p) => p.facility_id === req.requesting_facility_id);
      for (const p of requesterProfiles) {
        createNotification(p.id, 'accepted', 'Request Accepted', `${supplyingFac.name} accepted your request for ${req.quantity_requested} x ${ITEMS.find((i) => i.id === req.item_id)!.name}.`, `/tracking/${req.id}`, { requestId: req.id });
      }
      broadcast('request_accepted', { request: req, distance: dist });
      return req;
      });
    },
    async rejectRequest(requestId, actorId, reason) {
      await delay(400);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'requested') throw new Error('Only requested supplies can be rejected');
      const actor = PROFILES.find((p) => p.id === actorId);
      if (!actor || !actor.facility_id || req.supplying_facility_id && req.supplying_facility_id !== actor.facility_id) {
        throw new Error('Not authorized to reject this request');
      }

      const prev = req.status;
      req.status = 'rejected';
      req.updated_at = nowISO();
      emitRequestEvent(req.id, prev, 'rejected', actorId, `Rejected: ${reason}`);
      broadcast('request_rejected', req);
      return req;
    },
    async cancelRequest(requestId, actorId) {
      await delay(400);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'requested') throw new Error('Only requested supplies can be cancelled');
      if (req.created_by !== actorId) throw new Error('Only the requester can cancel');
      const prev = req.status;
      req.status = 'cancelled';
      req.updated_at = nowISO();
      emitRequestEvent(req.id, prev, 'cancelled', actorId, 'Request cancelled by requesting facility.');
      broadcast('request_cancelled', req);
      return req;
    },
    async dispatchRequest(requestId, actorId) {
      return withLock(dispatchMutex, async () => {
        await delay(600);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'accepted') throw new Error('Only accepted requests can be dispatched');
      const actor = PROFILES.find((p) => p.id === actorId);
      if (!actor || !actor.facility_id || req.supplying_facility_id !== actor.facility_id) {
        throw new Error('Only the supplying facility can dispatch');
      }
      const inv = findInventory(actor.facility_id, req.item_id);
      if (!inv) throw new Error('Inventory record not found');
      if (inv.quantity_reserved < req.quantity_requested) throw new Error('Reservation not found');

      inv.quantity_on_hand -= req.quantity_requested;
      inv.quantity_reserved -= req.quantity_requested;
      inv.updated_at = nowISO();

      const prev = req.status;
      req.status = 'dispatched';
      req.updated_at = nowISO();
      req.dispatched_at = nowISO();

      const tx: InventoryTransaction = {
        id: uuid(),
        inventory_id: inv.id,
        request_id: req.id,
        transaction_type: 'dispatch',
        quantity: req.quantity_requested,
        performed_by: actorId,
        created_at: nowISO(),
        notes: `Dispatched for request ${req.id}`,
      };
      TRANSACTIONS.push(tx);
      emitRequestEvent(req.id, prev, 'dispatched', actorId, 'Supplies dispatched.');
      broadcast('request_dispatched', req);
      return req;
      });
    },
    async markInTransit(requestId, actorId) {
      await delay(400);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'dispatched') throw new Error('Only dispatched requests can be marked in transit');
      const actor = PROFILES.find((p) => p.id === actorId);
      if (!actor || !actor.facility_id || req.supplying_facility_id !== actor.facility_id) {
        throw new Error('Only the supplying facility can update transit status');
      }
      const prev = req.status;
      req.status = 'in_transit';
      req.updated_at = nowISO();
      emitRequestEvent(req.id, prev, 'in_transit', actorId, 'Supplies in transit.');
      broadcast('request_in_transit', req);
      return req;
    },
    async confirmDelivery(requestId, receiverId) {
      await delay(500);
      const req = REQUESTS.find((r) => r.id === requestId);
      if (!req) throw new Error('Request not found');
      if (req.status !== 'in_transit') throw new Error('Only in-transit supplies can be delivered');
      const actor = PROFILES.find((p) => p.id === receiverId);
      if (!actor || !actor.facility_id || actor.facility_id !== req.requesting_facility_id) {
        throw new Error('Only the receiving facility can confirm delivery');
      }
      const prev = req.status;
      req.status = 'delivered';
      req.updated_at = nowISO();
      req.delivered_at = nowISO();
      emitRequestEvent(req.id, prev, 'delivered', receiverId, 'Delivery confirmed by receiving facility.');
      broadcast('request_delivered', req);
      return req;
    },
    async resetDemo() {
      await delay(800);
      REQUESTS.length = 0;
      TRANSACTIONS.length = 0;
      EVENTS.length = 0;
      NOTIFICATIONS.length = 0;
      INVENTORIES.forEach((inv) => {
        inv.quantity_reserved = 0;
        inv.updated_at = nowISO();
      });
      // Re-seed core inventories
      const reset: Record<string, { onHand: number; reserved: number }> = {
        'inv-alpha-oneg': { onHand: 0, reserved: 0 },
        'inv-alpha-antivenom': { onHand: 3, reserved: 0 },
        'inv-alpha-trauma': { onHand: 4, reserved: 0 },
        'inv-base-oneg': { onHand: 10, reserved: 0 },
        'inv-base-antivenom': { onHand: 12, reserved: 0 },
        'inv-base-trauma': { onHand: 12, reserved: 0 },
        'inv-base-burn': { onHand: 15, reserved: 0 },
        'inv-base-tourniquet': { onHand: 20, reserved: 0 },
        'inv-bravo-burn': { onHand: 8, reserved: 0 },
        'inv-bravo-trauma': { onHand: 6, reserved: 0 },
      };
      INVENTORIES.forEach((inv) => {
        const r = reset[inv.id];
        if (r) { inv.quantity_on_hand = r.onHand; inv.quantity_reserved = r.reserved; inv.updated_at = nowISO(); }
      });
      broadcast('demo_reset', null);
      return;
    },
    subscribe(channels, handler) {
      listeners.push(handler);
      return () => {
        listeners = listeners.filter((l) => l !== handler);
      };
    },
  };
}

export const demoStore = createDemoStore();
