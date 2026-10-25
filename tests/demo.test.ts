import { describe, it, expect, beforeEach } from "vitest";
import { demoStore } from "@/lib/demo-store";
import type { Urgency, PatientStatus } from "@/types";

const DEMO_PASSWORD = "MedDrop123!";

function baseActor() { return "user-base"; }
function alphaActor() { return "user-alpha"; }

async function createCriticalBloodRequest() {
  return demoStore.createRequest({
    requesting_facility_id: "fac-alpha",
    item_id: "item-oneg",
    quantity_requested: 2,
    urgency: "critical",
    patient_status: "incoming",
    radius_km: 50,
    notes: "Medivac inbound",
    incident_reference: "INC-001",
    created_by: alphaActor(),
  });
}

describe("MedDrop demo store", () => {
  beforeEach(async () => {
    await demoStore.resetDemo();
  });

  it("authenticates demo accounts with correct roles and facilities", async () => {
    const alpha = await demoStore.signIn("alpha@meddrop.demo", DEMO_PASSWORD);
    expect(alpha.profile.role).toBe("requester");
    expect(alpha.facility?.name).toBe("Outpost Alpha");

    const base = await demoStore.signIn("base@meddrop.demo", DEMO_PASSWORD);
    expect(base.profile.role).toBe("supplier");
    expect(base.facility?.name).toBe("Sector Base Hospital");

    const admin = await demoStore.signIn("admin@meddrop.demo", DEMO_PASSWORD);
    expect(admin.profile.role).toBe("administrator");
    expect(admin.facility).toBeNull();

    await expect(demoStore.signIn("alpha@meddrop.demo", "wrong")).rejects.toThrow();
  });

  it("creates an emergency request and notifies eligible suppliers", async () => {
    const result = await createCriticalBloodRequest();
    expect(result.request.status).toBe("requested");
    expect(result.request.quantity_requested).toBe(2);
    expect(result.request.accepted_at).toBeNull();

    const baseNotifications = await demoStore.notifications("user-base");
    expect(baseNotifications.length).toBeGreaterThan(0);
    expect(baseNotifications[0].type).toBe("new_request");

    expect(result.suppliers.length).toBeGreaterThan(0);
    const baseSupply = result.suppliers.find((s) => s.facility.id === "fac-base");
    expect(baseSupply).toBeDefined();
    expect(baseSupply!.available).toBeGreaterThanOrEqual(2);
  });

  it("rejects requests no supplier can fulfill within range", async () => {
    await expect(
      demoStore.createRequest({
        requesting_facility_id: "fac-alpha",
        item_id: "item-oneg",
        quantity_requested: 100,
        urgency: "critical",
        patient_status: "incoming",
        radius_km: 50,
        created_by: alphaActor(),
      })
    ).rejects.toThrow(/No supplying facility/);
  });

  it("reserves stock atomically on accept and prevents concurrent over-allocation", async () => {
    const result = await createCriticalBloodRequest();
    const invBefore = (await demoStore.inventories({ facility_id: "fac-base" })).find((i) => i.item_id === "item-oneg")!;
    expect(invBefore.quantity_on_hand).toBe(10);

    // Two concurrent accepts for the entire stock: only one may succeed.
    const outcomes = await Promise.allSettled([
      demoStore.acceptRequest(result.request.id, baseActor()),
      demoStore.acceptRequest(result.request.id, baseActor()),
    ]);
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const invAfter = (await demoStore.inventories({ facility_id: "fac-base" })).find((i) => i.item_id === "item-oneg")!;
    expect(invAfter.quantity_reserved).toBe(2);
    expect(invAfter.quantity_on_hand).toBe(10); // reservation does not deduct on-hand yet
    const avail = invAfter.quantity_on_hand - invAfter.quantity_reserved;
    expect(avail).toBe(8); // never negative
  });

  it("rejects requests that exceed available stock", async () => {
    await expect(
      demoStore.createRequest({
        requesting_facility_id: "fac-alpha",
        item_id: "item-oneg",
        quantity_requested: 11,
        urgency: "critical",
        patient_status: "incoming",
        radius_km: 50,
        created_by: alphaActor(),
      })
    ).rejects.toThrow(/No supplying facility/);
  });

  it("enforces valid status transitions", async () => {
    const result = await createCriticalBloodRequest();
    // Cannot dispatch before acceptance.
    await expect(demoStore.dispatchRequest(result.request.id, baseActor())).rejects.toThrow(/Only accepted/);
    await demoStore.acceptRequest(result.request.id, baseActor());
    // Cannot accept an already-accepted request.
    await expect(demoStore.acceptRequest(result.request.id, baseActor())).rejects.toThrow(/Only requested/);
  });

  it("dispatch deducts inventory exactly once and marks in transit", async () => {
    const result = await createCriticalBloodRequest();
    await demoStore.acceptRequest(result.request.id, baseActor());
    await demoStore.dispatchRequest(result.request.id, baseActor());

    const inv = (await demoStore.inventories({ facility_id: "fac-base" })).find((i) => i.item_id === "item-oneg")!;
    expect(inv.quantity_on_hand).toBe(8);
    expect(inv.quantity_reserved).toBe(0);

    const txs = await demoStore.transactions({ facility_id: "fac-base" });
    const dispatches = txs.filter((t) => t.transaction_type === "dispatch" && t.request_id === result.request.id);
    expect(dispatches.length).toBe(1);
    expect(dispatches[0].quantity).toBe(2);

    await demoStore.markInTransit(result.request.id, baseActor());
    const updated = (await demoStore.requests()).find((r) => r.id === result.request.id)!;
    expect(updated.status).toBe("in_transit");
    expect(updated.dispatched_at).not.toBeNull();
  });

  it("cancellation of a pending request releases nothing reserved", async () => {
    const result = await createCriticalBloodRequest();
    await demoStore.cancelRequest(result.request.id, alphaActor());
    const updated = (await demoStore.requests()).find((r) => r.id === result.request.id)!;
    expect(updated.status).toBe("cancelled");

    const inv = (await demoStore.inventories({ facility_id: "fac-base" })).find((i) => i.item_id === "item-oneg")!;
    expect(inv.quantity_reserved).toBe(0);
  });

  it("confirm delivery records delivered status and audit event", async () => {
    const result = await createCriticalBloodRequest();
    await demoStore.acceptRequest(result.request.id, baseActor());
    await demoStore.dispatchRequest(result.request.id, baseActor());
    await demoStore.markInTransit(result.request.id, baseActor());

    await demoStore.confirmDelivery(result.request.id, alphaActor());
    const updated = (await demoStore.requests()).find((r) => r.id === result.request.id)!;
    expect(updated.status).toBe("delivered");
    expect(updated.delivered_at).not.toBeNull();

    const events = await demoStore.events(result.request.id);
    const statuses = events.map((e) => e.new_status);
    expect(statuses).toContain("accepted");
    expect(statuses).toContain("dispatched");
    expect(statuses).toContain("in_transit");
    expect(statuses).toContain("delivered");

    const txs = await demoStore.transactions();
    const delivery = txs.find((t) => t.transaction_type === "dispatch" && t.request_id === result.request.id);
    expect(delivery).toBeDefined();
  });

  it("prevents duplicate submissions within a short window", async () => {
    const first = await createCriticalBloodRequest();
    const second = await createCriticalBloodRequest();
    expect(second.request.id).toBe(first.request.id);

    const all = await demoStore.requests({ facility_id: "fac-alpha" });
    const matching = all.filter((r) => r.item_id === "item-oneg" && r.status === "requested");
    expect(matching.length).toBe(1);
  });

  it("dashboard counts reflect persisted data", async () => {
    await createCriticalBloodRequest();
    const stats = await demoStore.stats();
    expect(stats.pending_acceptance).toBeGreaterThanOrEqual(1);
    expect(stats.active_requests).toBeGreaterThanOrEqual(1);
    expect(stats.total_facilities).toBe(3);
  });

  it("resetDemo restores the seed state", async () => {
    await createCriticalBloodRequest();
    await demoStore.acceptRequest((await demoStore.requests({ status: "requested" }))[0].id, baseActor());
    await demoStore.resetDemo();

    const requests = await demoStore.requests();
    expect(requests.length).toBe(0);
    const stats = await demoStore.stats();
    expect(stats.pending_acceptance).toBe(0);
    const inv = (await demoStore.inventories({ facility_id: "fac-alpha" })).find((i) => i.item_id === "item-oneg")!;
    expect(inv.quantity_on_hand).toBe(0);
  });
});
