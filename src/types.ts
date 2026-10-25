export type UserRole = 'requester' | 'supplier' | 'administrator';
export type FacilityType = 'outpost' | 'relief camp' | 'clinic' | 'base hospital';
export type Urgency = 'critical' | 'high' | 'moderate';
export type PatientStatus = 'incoming' | 'on_site' | 'stabilized';
export type RequestStatus =
  | 'requested'
  | 'accepted'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'rejected'
  | 'cancelled';
export type TransactionType = 'receipt' | 'reservation' | 'release' | 'dispatch' | 'adjustment';
export type NotificationType = 'new_request' | 'accepted' | 'dispatched' | 'delivered' | 'rejected' | 'system';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  latitude: number;
  longitude: number;
  address?: string | null;
  region?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  facility_id: string | null;
  created_at: string;
}

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  blood_group: string | null;
  is_blood_product: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  facility_id: string;
  item_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  min_threshold: number;
  updated_at: string;
}

export interface SupplyRequest {
  id: string;
  requesting_facility_id: string;
  supplying_facility_id: string | null;
  item_id: string;
  quantity_requested: number;
  urgency: Urgency;
  patient_status: PatientStatus;
  radius_km: number;
  notes: string | null;
  incident_reference: string | null;
  status: RequestStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
}

export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  request_id: string | null;
  transaction_type: TransactionType;
  quantity: number;
  performed_by: string;
  created_at: string;
  notes: string | null;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  previous_status: string | null;
  new_status: string;
  actor_id: string;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string | null;
  data: Record<string, unknown> | null;
}

export interface DashboardStats {
  total_facilities: number;
  critical_shortages: number;
  active_requests: number;
  supplies_in_transit: number;
  pending_acceptance: number;
}

export interface EligibleSupplier {
  facility: Facility;
  available_quantity: number;
  distance_km: number;
  inventory_id: string;
}

export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
  facility: Facility;
  profile: Profile;
}

export interface AuthState {
  user: Profile | null;
  facility: Facility | null;
  isAuthenticated: boolean;
  demoMode: boolean;
}

export const STATUS_ORDER: RequestStatus[] = [
  'requested',
  'accepted',
  'dispatched',
  'in_transit',
  'delivered',
];

export const URGENCY_LABELS: Record<Urgency, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
};

export const URGENCY_COLORS: Record<Urgency, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  moderate: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const STOCK_STATUS_LABELS = {
  critical: 'Critical',
  low: 'Low',
  available: 'Available',
} as const;

export { formatRelative, formatDistance, formatNumber } from '@/lib/utils';
