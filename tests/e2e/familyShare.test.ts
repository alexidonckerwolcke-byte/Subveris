import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { registerRoutes } from "../../server/routes";
import { createClient } from '@supabase/supabase-js';

// Uses same env vars as the server; must point at a testable Supabase project.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// tiny utility to mimic extractUserIdFromToken used in server
function makeToken(userId: string): string {
  // header.payload.signature just needs two dots
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64');
  return `a.${header}.${payload}.`;
}

describe('E2E family sharing & cost-per-use', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    // match server setup with middleware used in index.ts
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const server = createServer(app);
    await registerRoutes(server, app);
  });

  it('owner and member see correct cost-per-use results with toggle', async () => {
    // create unique ids to avoid collisions
    const ownerId = randomUUID();
    const memberId = randomUUID();
    const otherId = randomUUID();

    // ensure users exist in auth schema so foreign keys succeed
    // create simple auth users with email so the auth table has entries
    const { data: ownerUser, error: ownerErr } = await supabase.auth.admin.createUser({
      id: ownerId,
      email: `${ownerId}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    const { data: memberUser, error: memberErr } = await supabase.auth.admin.createUser({
      id: memberId,
      email: `${memberId}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    const { data: otherUser, error: otherErr } = await supabase.auth.admin.createUser({
      id: otherId,
      email: `${otherId}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (ownerErr || memberErr || otherErr) {
      console.error('error creating auth users', ownerErr, memberErr, otherErr);
    }

    // generate tokens for HTTP auth
    const ownerToken = `Bearer ${makeToken(ownerId)}`;
    const memberToken = `Bearer ${makeToken(memberId)}`;

    // create group via HTTP so we exercise the route logic
    const createRes = await request(app)
      .post('/api/family-groups')
      .send({ name: 'e2e-group' })
      .set('Authorization', ownerToken)
      .expect(201);
    const group = createRes.body;
    expect(group).toBeTruthy();
    const groupId = group.id;

    // add members using the REST endpoint (emails correspond to the ones we created)
    const memberEmail = `${memberId}@example.com`;
    const otherEmail = `${otherId}@example.com`;

    await request(app)
      .post(`/api/family-groups/${groupId}/members`)
      .set('Authorization', ownerToken)
      .send({ memberEmail })
      .expect(201);

    await request(app)
      .post(`/api/family-groups/${groupId}/members`)
      .set('Authorization', ownerToken)
      .send({ memberEmail: otherEmail })
      .expect(201);

    // enable sharing via settings endpoint
    await request(app)
      .put(`/api/family-groups/${groupId}/settings`)
      .set('Authorization', ownerToken)
      .send({ show_family_data: true })
      .expect(200);

    // create subscriptions with usage counts

    // verify family-data endpoint returns the right data & metrics object
    const famDataRes = await request(app)
      .get(`/api/family-groups/${groupId}/family-data`)
      .set('Authorization', ownerToken)
      .expect(200);
    expect(Array.isArray(famDataRes.body.subscriptions)).toBe(true);
    // although no subs exist yet we still expect metrics field
    expect(famDataRes.body.metrics).toBeDefined();
    expect(famDataRes.body.metrics.totalSubscriptions).toBe(0);

    const { data: ownerSub, error: ownerSubErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: ownerId,
        name: 'OwnerSub',
        amount: 20,
        frequency: 'monthly',
        status: 'active',
        usage_count: 2,
        currency: 'USD',
        category: 'test',
        next_billing_at: new Date().toISOString(),
      })
      .select()
      .single();
    console.log('owner subscription insert', { ownerSub, ownerSubErr });
    expect(ownerSub).toBeTruthy();

    const { data: memberSub, error: memberSubErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: memberId,
        name: 'MemberSub',
        amount: 10,
        frequency: 'monthly',
        status: 'active',
        usage_count: 5,
        currency: 'USD',
        category: 'test',
        next_billing_at: new Date().toISOString(),
      })
      .select()
      .single();
    console.log('member subscription insert', { memberSub, memberSubErr });
    expect(memberSub).toBeTruthy();

    // re-fetch family-data and ensure metrics now reflect the two subscriptions
    const famDataAfterRes = await request(app)
      .get(`/api/family-groups/${groupId}/family-data`)
      .set('Authorization', ownerToken)
      .expect(200);
    expect(famDataAfterRes.body.metrics.totalSubscriptions).toBe(2);

    // owner should see both subs in cost-per-use
    const ownerRes = await request(app)
      .get(`/api/analysis/cost-per-use?familyGroupId=${groupId}`)
      .set('Authorization', ownerToken);
    if (ownerRes.status !== 200) {
      console.error('owner cost-per-use failed', ownerRes.status, ownerRes.body);
    }
    expect(ownerRes.status).toBe(200);
    expect(Array.isArray(ownerRes.body)).toBe(true);
    expect(ownerRes.body.length).toBe(2);
    const ownerNames = ownerRes.body.map((r: any) => r.name);
    expect(ownerNames).toContain('OwnerSub');
    expect(ownerNames).toContain('MemberSub');
    // values should reflect usage counts
    const ownerRow = ownerRes.body.find((r: any) => r.name === 'OwnerSub');
    expect(ownerRow.usageCount).toBe(2);

    // member should be allowed as well
    const memberRes = await request(app)
      .get(`/api/analysis/cost-per-use?familyGroupId=${groupId}`)
      .set('Authorization', memberToken);
    if (memberRes.status !== 200) {
      console.error('member cost-per-use failed', memberRes.status, memberRes.body);
    }
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.length).toBe(2);

    // share the owner's subscription explicitly and verify the listing endpoint
    await request(app)
      .post(`/api/family-groups/${groupId}/share-subscription`)
      .set('Authorization', ownerToken)
      .send({ subscriptionId: ownerSub.id })
      .expect(201);

    const sharedList = await request(app)
      .get(`/api/family-groups/${groupId}/shared-subscriptions`)
      .set('Authorization', ownerToken)
      .expect(200);
    expect(Array.isArray(sharedList.body)).toBe(true);
    expect(sharedList.body.length).toBe(1);

    // after sharing, a member should see the owner's subscription when fetching family-data
    const memberFamilyData = await request(app)
      .get(`/api/family-groups/${groupId}/family-data`)
      .set('Authorization', memberToken)
      .expect(200);
    expect(memberFamilyData.body.subscriptions.some((s: any) => s.id === ownerSub.id)).toBe(true);

    // assign a cost split to the member and verify via the new endpoints
    const sharedId = sharedList.body[0].id;
    await request(app)
      .post(`/api/family-groups/${groupId}/shared-subscriptions/${sharedId}/cost-splits`)
      .set('Authorization', ownerToken)
      .send({ userId: memberId, percentage: 30 })
      .expect(201);

    const splitsRes = await request(app)
      .get(`/api/family-groups/${groupId}/shared-subscriptions/${sharedId}/cost-splits`)
      .set('Authorization', ownerToken)
      .expect(200);
    expect(Array.isArray(splitsRes.body)).toBe(true);
    expect(splitsRes.body.length).toBe(1);

    // now unshare and ensure both lists clear
    await request(app)
      .delete(`/api/family-groups/${groupId}/shared-subscriptions/${sharedId}`)
      .set('Authorization', ownerToken)
      .expect(204);

    await request(app)
      .get(`/api/family-groups/${groupId}/shared-subscriptions`)
      .set('Authorization', ownerToken)
      .expect(200)
      .then(r => expect(r.body.length).toBe(0));

    await request(app)
      .get(`/api/family-groups/${groupId}/shared-subscriptions/${sharedId}/cost-splits`)
      .set('Authorization', ownerToken)
      .expect(200)
      .then(r => expect(r.body.length).toBe(0));

    // now disable sharing and owner should see only personal sub
    await supabase
      .from('family_group_settings')
      .update({ show_family_data: false })
      .eq('family_group_id', groupId);

    const noShareRes = await request(app)
      .get(`/api/analysis/cost-per-use?familyGroupId=${groupId}`)
      .set('Authorization', ownerToken)
      .expect(403);
    expect(noShareRes.body.error).toMatch(/sharing not enabled/i);

    const personalRes = await request(app)
      .get('/api/analysis/cost-per-use')
      .set('Authorization', ownerToken)
      .expect(200);
    expect(personalRes.body.length).toBe(1);
    expect(personalRes.body[0].name).toBe('OwnerSub');
  }, 20000);
});
