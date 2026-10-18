import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { setStore } from '../src/db/index.js';
import { seedIfEmpty, DEMO_EMAIL, DEMO_PASSWORD } from '../src/db/seed.js';
import { MemoryStore } from '../src/db/store.js';

const app = createApp();
const api = (path: string) => `/api/v1${path}`;

beforeAll(async () => {
  setStore(new MemoryStore());
  await seedIfEmpty();
});

async function signUp(email: string) {
  const res = await request(app).post(api('/auth/register')).send({ name: 'Test Person', email, password: 'password123' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

describe('public browsing (no account)', () => {
  it('lists seeded campaigns and supports search, category and sort', async () => {
    const all = await request(app).get(api('/campaigns'));
    expect(all.status).toBe(200);
    expect(all.body.items.length).toBeGreaterThan(5);

    const search = await request(app).get(api('/campaigns?q=shade'));
    expect(search.body.items.map((c: { slug: string }) => c.slug)).toContain('shade-trees');

    const cat = await request(app).get(api('/campaigns?category=Health'));
    expect(cat.body.items.every((c: { category: string }) => c.category === 'Health')).toBe(true);

    const none = await request(app).get(api('/campaigns?q=zzzzzz'));
    expect(none.body.items).toHaveLength(0);

    const funded = await request(app).get(api('/campaigns?sort=mostFunded&limit=3'));
    const raised = funded.body.items.map((c: { raisedAmount: number }) => c.raisedAmount);
    expect([...raised].sort((a, b) => b - a)).toEqual(raised);
  });

  it('shows a public campaign detail with visible sources and estimates', async () => {
    const res = await request(app).get(api('/campaigns/school-water-stations'));
    expect(res.status).toBe(200);
    expect(res.body.campaign.sources.length).toBeGreaterThan(0);
    expect(res.body.campaign.estimatedReachAtGoal).toBe(8000 * 27);
    expect(res.body.campaign.canBack).toBe(true);
  });

  it('hides campaigns that are not public yet', async () => {
    const res = await request(app).get(api('/campaigns/bike-lanes'));
    expect(res.status).toBe(404);
  });
});

describe('auth', () => {
  it('rejects bad credentials with one message and accepts the demo account', async () => {
    const bad = await request(app).post(api('/auth/login')).send({ email: DEMO_EMAIL, password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    const ok = await request(app).post(api('/auth/login')).send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  it('validates registration and blocks duplicates', async () => {
    const weak = await request(app).post(api('/auth/register')).send({ name: 'A', email: 'nope', password: '123' });
    expect(weak.status).toBe(400);
    expect(weak.body.fields.email).toBeTruthy();
    await signUp('dupe@example.com');
    const dupe = await request(app).post(api('/auth/register')).send({ name: 'Test Person', email: 'dupe@example.com', password: 'password123' });
    expect(dupe.status).toBe(409);
  });
});

describe('create → review → back → track journey', () => {
  it('walks a campaign through the whole lifecycle', async () => {
    const token = await signUp('creator@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    // Draft autosave works with partial data.
    const created = await request(app).post(api('/campaigns')).set(auth).send({ title: 'Shade for bus stops' });
    expect(created.status).toBe(201);
    const id = created.body.campaign.id as string;

    // Submitting an incomplete draft returns specific field errors.
    const incomplete = await request(app).post(api(`/campaigns/${id}/submit`)).set(auth).send({ termsAccepted: true });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.fields.category).toBeTruthy();
    expect(incomplete.body.fields.goalAmount).toBeTruthy();

    // Title is limited to 60 characters on the server too.
    const tooLong = await request(app).patch(api(`/campaigns/${id}`)).set(auth).send({ title: 'x'.repeat(61) });
    expect(tooLong.status).toBe(400);

    await request(app)
      .patch(api(`/campaigns/${id}`))
      .set(auth)
      .send({
        category: 'Environment',
        creatorName: 'Test Person',
        shortDescription: 'Shade where the heat is worst.',
        story: [{ id: 'b1', type: 'paragraph', text: 'Bus stops in the hottest districts have no shade at all.' }],
        cover: { generated: true },
        targetAudience: 'Commuters in the hottest districts',
        platforms: ['Facebook'],
        goalAmount: 200,
      })
      .expect(200);

    // Terms must be accepted.
    const noTerms = await request(app).post(api(`/campaigns/${id}/submit`)).set(auth).send({});
    expect(noTerms.status).toBe(400);

    const submitted = await request(app).post(api(`/campaigns/${id}/submit`)).set(auth).send({ termsAccepted: true });
    expect(submitted.status).toBe(200);
    expect(submitted.body.campaign.status).toBe('submitted');

    // Submitted campaigns are not publicly visible and not editable.
    expect((await request(app).get(api(`/campaigns/${id}`))).status).toBe(404);
    expect((await request(app).patch(api(`/campaigns/${id}`)).set(auth).send({ title: 'Changed' })).status).toBe(403);

    // Nobody can back it before it is approved and open.
    const early = await request(app).post(api('/contributions')).send({ campaignId: id, amount: 10, guestEmail: 'guest@example.com' });
    expect(early.status).toBe(400);

    // Another account cannot advance it.
    const other = await signUp('other@example.com');
    expect((await request(app).post(api(`/campaigns/${id}/demo-advance`)).set({ Authorization: `Bearer ${other}` }).send({})).status).toBe(403);

    await request(app).post(api(`/campaigns/${id}/demo-advance`)).set(auth).send({ action: 'approve' }).expect(200);
    const open = await request(app).post(api(`/campaigns/${id}/demo-advance`)).set(auth).send({});
    expect(open.body.campaign.status).toBe('available_for_funding');

    // A guest can back it. Fees and reach come from the shared rules.
    const quote = await request(app).post(api('/contributions/quote')).send({ campaignId: id, amount: 50 });
    expect(quote.body.quote.estimatedReach).toBe(1350);
    expect(quote.body.quote.total).toBeGreaterThan(50);

    const con = await request(app).post(api('/contributions')).send({ campaignId: id, amount: 50, guestEmail: 'guest@example.com' });
    expect(con.status).toBe(201);
    const failed = await request(app).post(api(`/contributions/${con.body.contribution.id}/simulate`)).send({ outcome: 'fail' });
    expect(failed.body.contribution.status).toBe('failed');
    // A settled payment cannot be settled again.
    expect((await request(app).post(api(`/contributions/${con.body.contribution.id}/simulate`)).send({ outcome: 'success' })).status).toBe(400);

    const con2 = await request(app).post(api('/contributions')).send({ campaignId: id, amount: 60, guestEmail: 'guest@example.com' });
    const ok = await request(app).post(api(`/contributions/${con2.body.contribution.id}/simulate`)).send({ outcome: 'success' });
    expect(ok.body.contribution.status).toBe('succeeded');
    expect(ok.body.campaign.raisedAmount).toBe(60);

    // Reaching 25% of the goal creates a milestone report and a notification for the creator.
    const reports = await request(app).get(api(`/campaigns/${id}/reports`));
    expect(reports.body.items.some((r: { title: string }) => r.title === '25% funded')).toBe(true);
    const notes = await request(app).get(api('/notifications')).set(auth);
    expect(notes.body.items.map((n: { type: string }) => n.type)).toEqual(expect.arrayContaining(['submission_received', 'approved', 'milestone_25']));

    // Funding completion does not start ads by itself.
    const big = await request(app).post(api('/contributions')).send({ campaignId: id, amount: 150, guestEmail: 'g@example.com' });
    await request(app).post(api(`/contributions/${big.body.contribution.id}/simulate`)).send({ outcome: 'success' });
    const detail = await request(app).get(api(`/campaigns/${id}`));
    expect(detail.body.campaign.status).toBe('goal_reached');
    expect(detail.body.campaign.canBack).toBe(false);

    for (const expected of ['distribution_preparation', 'promoting', 'completed']) {
      const step = await request(app).post(api(`/campaigns/${id}/demo-advance`)).set(auth).send({});
      expect(step.body.campaign.status).toBe(expected);
    }
    const final = await request(app).get(api(`/campaigns/${id}/reports`));
    expect(final.body.items.find((r: { kind: string }) => r.kind === 'final').metrics.reachKind).toBe('measured');
  });

  it('keeps backer names private unless chosen and requires sign-in for comments', async () => {
    const token = await signUp('backer@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const con = await request(app).post(api('/contributions')).set(auth).send({ campaignId: 'school-water-stations', amount: 10 });
    await request(app).post(api(`/contributions/${con.body.contribution.id}/simulate`)).set(auth).send({ outcome: 'success' });
    const backers = await request(app).get(api('/contributions/campaign/school-water-stations/backers'));
    expect(backers.body.named).not.toContain('Test');
    expect((await request(app).post(api('/campaigns/school-water-stations/comments')).send({ body: 'Nice one.' })).status).toBe(401);
    expect((await request(app).post(api('/campaigns/school-water-stations/comments')).set(auth).send({ body: 'Nice one.' })).status).toBe(201);
  });
});

describe('impact and profile', () => {
  it('summarises a backer’s impact for the demo account', async () => {
    const login = await request(app).post(api('/auth/login')).send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    const auth = { Authorization: `Bearer ${login.body.token}` };
    const res = await request(app).get(api('/me/impact?range=all')).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.backed.totalContributed).toBe(55);
    expect(res.body.backed.estimatedReach).toBe(55 * 27);

    const mine = await request(app).get(api('/campaigns/mine')).set(auth);
    const statuses = mine.body.items.map((c: { status: string }) => c.status);
    expect(statuses).toEqual(expect.arrayContaining(['submitted', 'changes_requested', 'available_for_funding', 'promoting', 'completed']));
  });
});

describe('creator updates', () => {
  it('lets only the owner post an update on a live campaign', async () => {
    const login = await request(app).post(api('/auth/login')).send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    const owner = { Authorization: `Bearer ${login.body.token}` };
    const ok = await request(app).post(api('/campaigns/night-bus-tickets/updates')).set(owner).send({ title: 'Halfway there', body: 'We have passed a third of the goal this week.' });
    expect(ok.status).toBe(201);
    const stranger = await signUp('stranger@example.com');
    const denied = await request(app).post(api('/campaigns/night-bus-tickets/updates')).set({ Authorization: `Bearer ${stranger}` }).send({ title: 'Hi there', body: 'Not my campaign at all.' });
    expect(denied.status).toBe(403);
    const reports = await request(app).get(api('/campaigns/night-bus-tickets/reports'));
    expect(reports.body.items.some((r: { kind: string }) => r.kind === 'update')).toBe(true);
  });
});

describe('reach targeting', () => {
  it('requires budget shares to add up to 100 across several platforms', async () => {
    const token = await signUp('budget@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app).post(api('/campaigns')).set(auth).send({});
    const id = created.body.campaign.id as string;
    await request(app)
      .patch(api(`/campaigns/${id}`))
      .set(auth)
      .send({
        title: 'Budget check',
        category: 'Civic',
        creatorName: 'Test',
        shortDescription: 'Short.',
        story: [{ id: 'b', type: 'paragraph', text: 'A paragraph long enough to count as a story.' }],
        cover: { generated: true },
        targetAudience: 'Voters',
        goalAmount: 300,
        platforms: ['Facebook', 'Instagram'],
        reach: { locations: ['Canada'], interests: ['Civic life'], budget: { Facebook: 70, Instagram: 20 } },
        suggestedActions: ['Share it'],
      })
      .expect(200);
    const bad = await request(app).post(api(`/campaigns/${id}/submit`)).set(auth).send({ termsAccepted: true });
    expect(bad.status).toBe(400);
    expect(bad.body.fields.budget).toBeTruthy();
    await request(app).patch(api(`/campaigns/${id}`)).set(auth).send({ reach: { locations: ['Canada'], interests: [], budget: { Facebook: 70, Instagram: 30 } } }).expect(200);
    const ok = await request(app).post(api(`/campaigns/${id}/submit`)).set(auth).send({ termsAccepted: true });
    expect(ok.status).toBe(200);
  });
});
