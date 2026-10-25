-- MedDrop Emergency Medical Inventory Platform
-- Supabase schema. Run this in the Supabase SQL editor to provision the real backend.
-- The frontend runs in demo mode (in-memory backend) when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
-- are not configured.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('outpost','relief camp','clinic','base hospital')),
  latitude double precision not null,
  longitude double precision not null,
  address text,
  region text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('requester','supplier','administrator')),
  facility_id uuid references facilities(id),
  created_at timestamptz not null default now()
);

create table supply_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null default 'units',
  blood_group text,
  is_blood_product boolean not null default false,
  created_at timestamptz not null default now()
);

create table inventories (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  item_id uuid not null references supply_items(id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  min_threshold integer not null default 0 check (min_threshold >= 0),
  updated_at timestamptz not null default now(),
  unique (facility_id, item_id)
);

create table supply_requests (
  id uuid primary key default gen_random_uuid(),
  requesting_facility_id uuid not null references facilities(id),
  supplying_facility_id uuid references facilities(id),
  item_id uuid not null references supply_items(id),
  quantity_requested integer not null check (quantity_requested > 0),
  urgency text not null check (urgency in ('critical','high','moderate')),
  patient_status text not null check (patient_status in ('incoming','on_site','stabilized')),
  radius_km numeric not null check (radius_km > 0),
  notes text,
  incident_reference text,
  status text not null check (status in ('requested','accepted','dispatched','in_transit','delivered','rejected','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references inventories(id) on delete cascade,
  request_id uuid references supply_requests(id) on delete set null,
  transaction_type text not null check (transaction_type in ('receipt','reservation','release','dispatch','adjustment')),
  quantity integer not null,
  performed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  notes text
);

create table request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references supply_requests(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('new_request','accepted','dispatched','delivered','rejected','system')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  link text,
  data jsonb
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_inventories_facility on inventories(facility_id);
create index idx_inventories_item on inventories(item_id);
create index idx_inventories_facility_item on inventories(facility_id, item_id);
create index idx_requests_requesting on supply_requests(requesting_facility_id);
create index idx_requests_supplying on supply_requests(supplying_facility_id);
create index idx_requests_status on supply_requests(status);
create index idx_requests_created_at on supply_requests(created_at);
create index idx_transactions_inventory on inventory_transactions(inventory_id);
create index idx_transactions_request on inventory_transactions(request_id);
create index idx_events_request on request_events(request_id);
create index idx_notifications_user on notifications(user_id, read);
create index idx_profiles_facility on profiles(facility_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table facilities enable row level security;
alter table profiles enable row level security;
alter table supply_items enable row level security;
alter table inventories enable row level security;
alter table supply_requests enable row level security;
alter table inventory_transactions enable row level security;
alter table request_events enable row level security;
alter table notifications enable row level security;

-- Facilities: readable by authenticated users.
create policy facilities_select on facilities for select to authenticated using (true);

-- Profiles: users read their own profile; administrators read all.
create policy profiles_select_own on profiles for select to authenticated using (auth.uid() = id);
create policy profiles_select_admin on profiles for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'administrator'));

-- Supply items: readable by all authenticated users.
create policy supply_items_select on supply_items for select to authenticated using (true);

-- Inventories: readable by members of the owning facility.
create policy inventories_select on inventories for select to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid()
      and (p.facility_id = inventories.facility_id or p.role = 'administrator')
  ));

-- Requests: readable by requesting/supplying facility members and admins.
create policy supply_requests_select on supply_requests for select to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'administrator')
    or exists (select 1 from profiles p where p.id = auth.uid() and p.facility_id = supply_requests.requesting_facility_id)
    or exists (select 1 from profiles p where p.id = auth.uid() and p.facility_id = supply_requests.supplying_facility_id)
  );

-- Request mutations are handled through SECURITY DEFINER functions below.

-- Inventory transactions and events: readable by facility members / request parties.
create policy inventory_transactions_select on inventory_transactions for select to authenticated
  using (exists (
    select 1 from inventories i join profiles p on p.id = auth.uid()
    where i.id = inventory_transactions.inventory_id
      and (p.facility_id = i.facility_id or p.role = 'administrator')
  ));

create policy request_events_select on request_events for select to authenticated
  using (exists (
    select 1 from supply_requests r join profiles p on p.id = auth.uid()
    where r.id = request_events.request_id
      and (p.facility_id in (r.requesting_facility_id, r.supplying_facility_id) or p.role = 'administrator')
  ));

create policy notifications_select on notifications for select to authenticated using (auth.uid() = user_id);
create policy notifications_update_own on notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Atomic backend operations (security definer functions)
-- ---------------------------------------------------------------------------

create or replace function accept_request(p_request_id uuid, p_actor_id uuid)
returns supply_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request supply_requests%rowtype;
  v_actor profiles%rowtype;
  v_inv inventories%rowtype;
  v_req_fac uuid;
  begin
  select * into v_request from supply_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'requested' then raise exception 'Only requested supplies can be accepted'; end if;

  select * into v_actor from profiles where id = p_actor_id;
  if not found or v_actor.facility_id is null then raise exception 'Actor must belong to a facility'; end if;

  select * into v_inv from inventories
  where facility_id = v_actor.facility_id and item_id = v_request.item_id for update;
  if not found then raise exception 'No inventory record for this item at your facility'; end if;
  if (v_inv.quantity_on_hand - v_inv.quantity_reserved) < v_request.quantity_requested then
    raise exception 'Insufficient stock to accept this request';
  end if;

  update inventories
  set quantity_reserved = quantity_reserved + v_request.quantity_requested,
      updated_at = now()
  where id = v_inv.id;

  select requesting_facility_id into v_req_fac from supply_requests where id = p_request_id;

  update supply_requests
  set supplying_facility_id = v_actor.facility_id,
      status = 'accepted',
      updated_at = now(),
      accepted_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into inventory_transactions (inventory_id, request_id, transaction_type, quantity, performed_by, notes)
  values (v_inv.id, p_request_id, 'reservation', v_request.quantity_requested, p_actor_id,
          format('Reserved for request %s', p_request_id));

  insert into request_events (request_id, previous_status, new_status, actor_id, note)
  values (p_request_id, 'requested', 'accepted', p_actor_id,
          format('Accepted by facility %s', v_actor.facility_id));

  return v_request;
end;
$$;

create or replace function reject_request(p_request_id uuid, p_actor_id uuid, p_reason text)
returns supply_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request supply_requests%rowtype;
  v_actor profiles%rowtype;
begin
  select * into v_request from supply_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'requested' then raise exception 'Only requested supplies can be rejected'; end if;

  select * into v_actor from profiles where id = p_actor_id;
  if not found then raise exception 'Actor not found'; end if;
  if v_request.supplying_facility_id is distinct from v_actor.facility_id then
    raise exception 'Not authorized to reject this request';
  end if;

  update supply_requests
  set status = 'rejected', updated_at = now()
  where id = p_request_id returning * into v_request;

  insert into request_events (request_id, previous_status, new_status, actor_id, note)
  values (p_request_id, 'requested', 'rejected', p_actor_id, p_reason);

  return v_request;
end;
$$;

create or replace function cancel_request(p_request_id uuid, p_actor_id uuid)
returns supply_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request supply_requests%rowtype;
begin
  select * into v_request from supply_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'requested' then raise exception 'Only requested supplies can be cancelled'; end if;
  if v_request.created_by <> p_actor_id then raise exception 'Only the requester can cancel'; end if;

  update supply_requests set status = 'cancelled', updated_at = now()
  where id = p_request_id returning * into v_request;

  insert into request_events (request_id, previous_status, new_status, actor_id, note)
  values (p_request_id, 'requested', 'cancelled', p_actor_id, 'Request cancelled by requesting facility.');

  return v_request;
end;
$$;

create or replace function dispatch_request(p_request_id uuid, p_actor_id uuid)
returns supply_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request supply_requests%rowtype;
  v_actor profiles%rowtype;
  v_inv inventories%rowtype;
begin
  select * into v_request from supply_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'accepted' then raise exception 'Only accepted requests can be dispatched'; end if;

  select * into v_actor from profiles where id = p_actor_id;
  if not found or v_request.supplying_facility_id is distinct from v_actor.facility_id then
    raise exception 'Only the supplying facility can dispatch';
  end if;

  select * into v_inv from inventories
  where facility_id = v_actor.facility_id and item_id = v_request.item_id for update;
  if not found then raise exception 'Inventory record not found'; end if;
  if v_inv.quantity_reserved < v_request.quantity_requested then
    raise exception 'Reservation not found';
  end if;

  update inventories
  set quantity_on_hand = quantity_on_hand - v_request.quantity_requested,
      quantity_reserved = quantity_reserved - v_request.quantity_requested,
      updated_at = now()
  where id = v_inv.id;

  update supply_requests
  set status = 'dispatched', updated_at = now(), dispatched_at = now()
  where id = p_request_id returning * into v_request;

  insert into inventory_transactions (inventory_id, request_id, transaction_type, quantity, performed_by, notes)
  values (v_inv.id, p_request_id, 'dispatch', v_request.quantity_requested, p_actor_id,
          format('Dispatched for request %s', p_request_id));

  insert into request_events (request_id, previous_status, new_status, actor_id, note)
  values (p_request_id, 'accepted', 'dispatched', p_actor_id, 'Supplies dispatched.');

  return v_request;
end;
$$;

create or replace function confirm_delivery(p_request_id uuid, p_receiver_id uuid)
returns supply_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request supply_requests%rowtype;
  v_actor profiles%rowtype;
begin
  select * into v_request from supply_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'in_transit' then raise exception 'Only in-transit supplies can be delivered'; end if;

  select * into v_actor from profiles where id = p_receiver_id;
  if not found or v_actor.facility_id is distinct from v_request.requesting_facility_id then
    raise exception 'Only the receiving facility can confirm delivery';
  end if;

  update supply_requests
  set status = 'delivered', updated_at = now(), delivered_at = now()
  where id = p_request_id returning * into v_request;

  insert into request_events (request_id, previous_status, new_status, actor_id, note)
  values (p_request_id, 'in_transit', 'delivered', p_receiver_id, 'Delivery confirmed by receiving facility.');

  return v_request;
end;
$$;

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Seed data (three fictional facilities)
-- ---------------------------------------------------------------------------

insert into facilities (id, name, type, latitude, longitude, address, region, is_active) values
  ('fac-alpha', 'Outpost Alpha', 'outpost', 28.6139, 77.209, 'Forward operating outpost, Sector 7', 'Northern Border Zone', true),
  ('fac-base', 'Sector Base Hospital', 'base hospital', 28.6500, 77.2500, 'Main base hospital, Sector Command', 'Northern Border Zone', true),
  ('fac-bravo', 'Relief Camp Bravo', 'relief camp', 28.5800, 77.1500, 'Disaster relief camp, Grid 12', 'Northern Border Zone', true)
on conflict (id) do nothing;

insert into supply_items (id, name, category, unit, blood_group, is_blood_product) values
  ('item-oneg', 'O-Negative Blood', 'Blood Products', 'units', 'O-', true),
  ('item-apos', 'A-Positive Blood', 'Blood Products', 'units', 'A+', true),
  ('item-antivenom', 'Snake Antivenom', 'Antidotes', 'vials', null, false),
  ('item-trauma', 'Trauma Kit', 'Trauma', 'kits', null, false),
  ('item-burn', 'Burn Dressing', 'Wound Care', 'packs', null, false),
  ('item-tourniquet', 'Tourniquet', 'Trauma', 'units', null, false)
on conflict (id) do nothing;

insert into inventories (facility_id, item_id, quantity_on_hand, quantity_reserved, min_threshold) values
  ('fac-alpha', 'item-oneg', 0, 0, 5),
  ('fac-alpha', 'item-antivenom', 3, 0, 5),
  ('fac-alpha', 'item-trauma', 4, 0, 3),
  ('fac-base', 'item-oneg', 10, 0, 8),
  ('fac-base', 'item-antivenom', 12, 0, 6),
  ('fac-base', 'item-trauma', 12, 0, 10),
  ('fac-base', 'item-burn', 15, 0, 8),
  ('fac-base', 'item-tourniquet', 20, 0, 10),
  ('fac-bravo', 'item-burn', 8, 0, 5),
  ('fac-bravo', 'item-trauma', 6, 0, 5)
on conflict (facility_id, item_id) do nothing;

-- Note: profiles are created via Supabase Auth sign-up; link them to facilities
-- by updating profiles.facility_id after the user confirms their email.
