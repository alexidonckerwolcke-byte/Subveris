import { handleAffiliateApiRequest } from "../supabase/functions/api/affiliate";

function makeRequest(path: string, method = "GET", headers: Record<string, string> = {}, body?: unknown) {
  return new Request(`https://subveris.test${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeQuery(options: { single?: any; rows?: any[]; onInsert?: (value: any) => void } = {}) {
  const query: any = {};
  for (const method of ["select", "eq", "gte", "gt", "lte", "not", "order", "limit", "range"]) {
    query[method] = vi.fn(() => query);
  }
  query.insert = vi.fn((value: any) => { options.onInsert?.(value); return query; });
  query.update = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data: options.single ?? null, error: null });
  query.single = vi.fn().mockResolvedValue({ data: options.single ?? null, error: null });
  query.then = (resolve: any, reject: any) => Promise.resolve({ data: options.rows ?? [], error: null }).then(resolve, reject);
  return query;
}

function makeAuthClient(user: any) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) } };
}

describe("affiliate API authorization", () => {
  it("does not trust the legacy x-test-user-id header", async () => {
    const authClient = { auth: { getUser: vi.fn() } };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/status", "GET", { "x-test-user-id": "someone-else" }),
      "/affiliate/status",
      { db: {}, authClient, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(401);
    expect(authClient.auth.getUser).not.toHaveBeenCalled();
  });

  it("requires a verified, allowlisted user for admin data", async () => {
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) } };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/admin", "GET", { authorization: "Bearer valid-token" }),
      "/affiliate/admin",
      { db: {}, authClient, stripeSecretKey: "", adminUserIds: ["admin-2"] },
    );

    expect(response?.status).toBe(403);
  });

  it("allows an allowlisted admin user to read the affiliate admin overview", async () => {
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) } };
    const makeTableQuery = (rows: any[] = []) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
      })),
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
    });
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: { total: 0 }, error: null }),
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "admin@example.test" } }, error: null }) } },
      from: vi.fn((table: string) => {
        if (table === "affiliate_program_settings") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { commission_rate_bps: 2000, attribution_window_days: 30, minimum_payout_cents: 0, commission_basis: "amount_paid_after_discounts_including_tax" }, error: null }) })),
            })),
          };
        }
        return makeTableQuery();
      }),
    };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/admin", "GET", { authorization: "Bearer valid-token" }),
      "/affiliate/admin",
      { db, authClient, stripeSecretKey: "", adminUserIds: ["admin-1"] },
    );

    expect(response?.status).toBe(200);
  });

  it("exports commission rows for one creator when an affiliate ID is provided", async () => {
    const affiliateId = "123e4567-e89b-42d3-a456-426614174000";
    const commissionQuery: any = {};
    commissionQuery.select = vi.fn(() => commissionQuery);
    commissionQuery.order = vi.fn(() => commissionQuery);
    commissionQuery.eq = vi.fn(() => commissionQuery);
    commissionQuery.then = (resolve: any, reject: any) => Promise.resolve({
      data: [{
        id: "commission-1",
        affiliate_id: affiliateId,
        referred_user_id: "customer-12345678",
        stripe_invoice_id: "invoice-1",
        amount_paid_cents: 1000,
        currency: "usd",
        commission_rate_bps: 2000,
        commission_amount_cents: 200,
        commission_basis: "amount_paid",
        status: "approved",
        paid_at: null,
        created_at: "2026-10-23T12:00:00.000Z",
        affiliates: { creator_name: "Creator One" },
      }],
      error: null,
    }).then(resolve, reject);
    const payoutQuery: any = {};
    payoutQuery.select = vi.fn(() => payoutQuery);
    payoutQuery.in = vi.fn(() => payoutQuery);
    payoutQuery.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const authClient = makeAuthClient({ id: "admin-1" });
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn((table: string) => {
        if (table === "affiliate_commissions") return commissionQuery;
        if (table === "affiliate_payout_items") return payoutQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const response = await handleAffiliateApiRequest(
      makeRequest(`/affiliate/admin/export.csv?affiliateId=${affiliateId}`, "GET", { authorization: ["Bearer", "affiliate-export-test-token"].join(" ") }),
      "/affiliate/admin/export.csv",
      { db, authClient, stripeSecretKey: "", adminUserIds: ["admin-1"] },
    );
    const csv = await response?.text();

    expect(response?.status).toBe(200);
    expect(commissionQuery.eq).toHaveBeenCalledWith("affiliate_id", affiliateId);
    expect(csv).toContain("Creator One");
    expect(csv).toContain("commission-1");
    expect(response?.headers.get("content-disposition")).toContain(`affiliate-${affiliateId}-commissions.csv`);
  });

  it("saves creator-specific commission terms through the audited admin function", async () => {
    const affiliateId = "123e4567-e89b-42d3-a456-426614174000";
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/admin/creator-settings", "POST", { authorization: ["Bearer", "affiliate-admin-test-token"].join(" ") }, {
        affiliateId,
        rateBps: 1500,
        attributionWindowDays: 60,
        minimumPayoutCents: 2500,
        reason: "Agreed creator-specific campaign terms",
      }),
      "/affiliate/admin/creator-settings",
      { db: { rpc }, authClient: makeAuthClient({ id: "admin-1" }), stripeSecretKey: "", adminUserIds: ["admin-1"] },
    );

    expect(response?.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("affiliate_admin_update_creator_settings", {
      p_affiliate_id: affiliateId,
      p_rate_bps: 1500,
      p_window_days: 60,
      p_minimum_payout_cents: 2500,
      p_admin_user_id: "admin-1",
      p_reason: "Agreed creator-specific campaign terms",
    });
  });

  it("rejects invalid creator-specific terms", async () => {
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/admin/creator-settings", "POST", { authorization: ["Bearer", "affiliate-admin-test-token"].join(" ") }, {
        affiliateId: "123e4567-e89b-42d3-a456-426614174000",
        rateBps: 0,
        attributionWindowDays: 60,
        minimumPayoutCents: 2500,
        reason: "Invalid rate",
      }),
      "/affiliate/admin/creator-settings",
      { db: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }, authClient: makeAuthClient({ id: "admin-1" }), stripeSecretKey: "", adminUserIds: ["admin-1"] },
    );

    expect(response?.status).toBe(400);
  });

  it("returns the approved affiliate status and referral code to the creator", async () => {
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } }, error: null }) } };
    const affiliateQuery = {
      select: vi.fn(() => affiliateQuery),
      eq: vi.fn(() => affiliateQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "affiliate-1", user_id: "creator-1", status: "approved", creator_name: "Example Creator" }, error: null }),
    };
    const codeQuery = {
      select: vi.fn(() => codeQuery),
      eq: vi.fn(() => codeQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { code: "sv-demo123" }, error: null }),
    };
    const settingsQuery = {
      select: vi.fn(() => settingsQuery),
      eq: vi.fn(() => settingsQuery),
      single: vi.fn().mockResolvedValue({ data: { commission_rate_bps: 2000, attribution_window_days: 30, minimum_payout_cents: 0, commission_basis: "amount_paid_after_discounts_including_tax" }, error: null }),
    };
    const db = {
      from: vi.fn((table: string) => {
        if (table === "affiliates") return affiliateQuery;
        if (table === "affiliate_referral_codes") return codeQuery;
        if (table === "affiliate_program_settings") return settingsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/status", "GET", { authorization: "Bearer valid-token" }),
      "/affiliate/status",
      { db, authClient, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({
      status: "approved",
      affiliate: { creatorName: "Example Creator" },
      code: { code: "sv-demo123" },
    });
  });

  it("denies dashboard access unless the authenticated account is approved", async () => {
    const affiliateQuery = {
      select: vi.fn(() => affiliateQuery),
      eq: vi.fn(() => affiliateQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "affiliate-1", status: "pending" }, error: null }),
    };
    const db = {
      from: vi.fn(() => affiliateQuery),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } }, error: null }) } };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/dashboard", "GET", { authorization: "Bearer valid-token" }),
      "/affiliate/dashboard",
      { db, authClient, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(403);
    expect(db.from).toHaveBeenCalledWith("affiliates");
  });

  it("requires authentication for attribution claims", async () => {
    const authClient = { auth: { getUser: vi.fn() } };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/attribute", "POST", {}, { visitorToken: crypto.randomUUID() }),
      "/affiliate/attribute",
      { db: {}, authClient, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(401);
  });

  it("records a consented click for an active approved referral code without storing the raw token", async () => {
    const code = { id: "code-id", affiliate_id: "affiliate-id", affiliates: { status: "approved" } };
    let clickInsert: any;
    let clickReads = 0;
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn((table: string) => {
        if (table === "affiliate_referral_codes") return makeQuery({ single: code });
        if (table === "affiliate_program_settings") return makeQuery({ single: { attribution_window_days: 30 } });
        if (table === "affiliates") return makeQuery({ single: { attribution_window_days_override: 14 } });
        if (table === "affiliate_clicks") {
          clickReads += 1;
          return clickReads === 1
            ? makeQuery()
            : makeQuery({ onInsert: (value) => { clickInsert = value; } });
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const visitorToken = crypto.randomUUID();
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/click", "POST", {}, { code: "Creator123", visitorToken }),
      "/affiliate/click",
      { db, authClient: {}, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(200);
    expect(clickInsert).toMatchObject({ affiliate_id: "affiliate-id", referral_code_id: "code-id" });
    expect(clickInsert.visitor_hash).not.toBe(visitorToken);
    expect(clickInsert.visitor_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(clickInsert.expires_at).getTime() - Date.now()).toBeGreaterThan(13 * 86_400_000);
    expect(new Date(clickInsert.expires_at).getTime() - Date.now()).toBeLessThan(15 * 86_400_000);
    expect(db.from).not.toHaveBeenCalledWith("affiliate_attributions");
  });

  it("locks the latest eligible click to an authenticated free customer", async () => {
    const visitorToken = crypto.randomUUID();
    const click = {
      id: "click-id",
      affiliate_id: "affiliate-id",
      created_at: "2026-10-10T12:00:00.000Z",
      expires_at: "2026-11-09T12:00:00.000Z",
      affiliates: { user_id: "affiliate-user", status: "approved" },
    };
    let attributionInsert: any;
    let attributionReads = 0;
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "creator@example.test" } }, error: null }) } },
      from: vi.fn((table: string) => {
        if (table === "affiliate_attributions") {
          attributionReads += 1;
          return attributionReads === 1
            ? makeQuery()
            : makeQuery({ single: { id: "attribution-id" }, onInsert: (value) => { attributionInsert = value; } });
        }
        if (table === "affiliate_clicks") return makeQuery({ rows: [click] });
        if (table === "user_subscriptions") return makeQuery();
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const authClient = makeAuthClient({ id: "customer-user", email: "customer@example.test", created_at: "2026-10-10T12:00:01.000Z" });
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/attribute", "POST", { authorization: "Bearer valid-token" }, { visitorToken }),
      "/affiliate/attribute",
      { db, authClient, stripeSecretKey: "", adminUserIds: [] },
    );

    expect(response?.status).toBe(200);
    expect(attributionInsert).toMatchObject({ user_id: "customer-user", affiliate_id: "affiliate-id", click_id: "click-id" });
  });

  it("does not attribute an organic visit with no recorded referral click", async () => {
    const visitorToken = crypto.randomUUID();
    let attributionInsert: unknown;
    let attributionReads = 0;
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn((table: string) => {
        if (table === "affiliate_attributions") {
          attributionReads += 1;
          return attributionReads === 1
            ? makeQuery()
            : makeQuery({ onInsert: (value) => { attributionInsert = value; } });
        }
        if (table === "affiliate_clicks") return makeQuery({ rows: [] });
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/attribute", "POST", { authorization: "Bearer valid-token" }, { visitorToken }),
      "/affiliate/attribute",
      { db, authClient: makeAuthClient({ id: "customer-user", email: "customer@example.test" }), stripeSecretKey: "", adminUserIds: [] },
    );

    expect(await response?.json()).toMatchObject({ attributed: false, reason: "no_active_referral" });
    expect(attributionInsert).toBeUndefined();
  });

  it("excludes a customer with an existing paid subscription", async () => {
    const visitorToken = crypto.randomUUID();
    const click = {
      id: "click-id",
      affiliate_id: "affiliate-id",
      created_at: "2026-10-10T12:00:00.000Z",
      expires_at: "2026-11-09T12:00:00.000Z",
      affiliates: { user_id: "affiliate-user", status: "approved" },
    };
    let attributionReads = 0;
    let attributionInsert: unknown;
    const db = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "creator@example.test" } }, error: null }) } },
      from: vi.fn((table: string) => {
        if (table === "affiliate_attributions") {
          attributionReads += 1;
          return attributionReads === 1
            ? makeQuery()
            : makeQuery({ onInsert: (value) => { attributionInsert = value; } });
        }
        if (table === "affiliate_clicks") return makeQuery({ rows: [click] });
        if (table === "user_subscriptions") return makeQuery({ single: { plan_type: "premium", status: "active", stripe_customer_id: "cus_existing" } });
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const response = await handleAffiliateApiRequest(
      makeRequest("/affiliate/attribute", "POST", { authorization: "Bearer valid-token" }, { visitorToken }),
      "/affiliate/attribute",
      { db, authClient: makeAuthClient({ id: "customer-user", email: "customer@example.test" }), stripeSecretKey: "", adminUserIds: [] },
    );

    expect(await response?.json()).toMatchObject({ attributed: false, reason: "existing_paying_customer" });
    expect(attributionInsert).toBeUndefined();
  });
});