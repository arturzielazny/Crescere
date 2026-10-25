/**
 * Worker data tests: children, measurements, preferences and sharing,
 * exercised through the real client (src/lib/api.js) against a local D1 database.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createBrowser, uniqueEmail } from './browser.js';
import * as api from '../../src/lib/api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A signed-in browser; saved accounts can share, guests can't */
async function signedIn({ saved = true } = {}) {
  const browser = createBrowser();
  browser.use();
  const guest = await api.signInAnonymously();
  if (!saved) return { browser, user: guest };
  const user = await api.claimAccount(uniqueEmail(), 'secret123');
  return { browser, user };
}

const profile = { name: 'Zosia', birthDate: '2025-01-10', sex: 2 };

describe('children', () => {
  it('starts with no children', async () => {
    await signedIn();
    expect(await api.fetchChildren()).toEqual([]);
  });

  it('creates and returns children in app format, oldest first', async () => {
    await signedIn();
    const first = await api.createChild(profile);
    const second = await api.createChild({ name: 'Jan', birthDate: '2023-06-01', sex: 1 });

    expect(await api.fetchChildren()).toEqual([
      { id: first, profile, measurements: [] },
      { id: second, profile: { name: 'Jan', birthDate: '2023-06-01', sex: 1 }, measurements: [] }
    ]);
  });

  it('updates only the provided fields', async () => {
    await signedIn();
    const id = await api.createChild(profile);
    await api.updateChild(id, { name: 'Zofia' });
    await api.updateChild(id, { birthDate: '2025-01-11', sex: 1 });

    const [child] = await api.fetchChildren();
    expect(child.profile).toEqual({ name: 'Zofia', birthDate: '2025-01-11', sex: 1 });
  });

  it('validates the profile', async () => {
    await signedIn();
    await expect(api.createChild({ ...profile, birthDate: '2025-02-30' })).rejects.toMatchObject({
      status: 400
    });
    await expect(api.createChild({ ...profile, sex: 3 })).rejects.toMatchObject({ status: 400 });
    await expect(api.createChild({ ...profile, birthDate: null })).rejects.toMatchObject({
      status: 400
    });
    expect(await api.fetchChildren()).toEqual([]);
  });

  it('deletes a child with its measurements and shares', async () => {
    await signedIn();
    const id = await api.createChild(profile);
    await api.createMeasurement(id, { date: '2025-02-01', weight: 4000 });
    await api.createShare(id, 'Doctor');

    await api.deleteChild(id);

    expect(await api.fetchChildren()).toEqual([]);
    const counts = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM measurements WHERE child_id = ?1) AS m,
              (SELECT COUNT(*) FROM child_shares WHERE child_id = ?1) AS s`
    )
      .bind(id)
      .first();
    expect(counts).toEqual({ m: 0, s: 0 });
  });
});

describe('measurements', () => {
  it('creates measurements with optional values, sorted by date', async () => {
    await signedIn();
    const childId = await api.createChild(profile);
    const later = await api.createMeasurement(childId, {
      date: '2025-03-01',
      weight: 5100,
      length: 58.5,
      headCirc: 39.2
    });
    const earlier = await api.createMeasurement(childId, { date: '2025-02-01', weight: 4300 });

    const [child] = await api.fetchChildren();
    expect(child.measurements).toEqual([
      { id: earlier, date: '2025-02-01', weight: 4300, length: null, headCirc: null },
      { id: later, date: '2025-03-01', weight: 5100, length: 58.5, headCirc: 39.2 }
    ]);
  });

  it('rounds weight to whole grams', async () => {
    await signedIn();
    const childId = await api.createChild(profile);
    await api.createMeasurement(childId, { date: '2025-02-01', weight: 4300.6 });
    const [child] = await api.fetchChildren();
    expect(child.measurements[0].weight).toBe(4301);
  });

  it('updates and clears individual values', async () => {
    await signedIn();
    const childId = await api.createChild(profile);
    const id = await api.createMeasurement(childId, {
      date: '2025-02-01',
      weight: 4300,
      length: 55
    });

    await api.updateMeasurement(id, { length: null, headCirc: 37.5, date: '2025-02-02' });

    const [child] = await api.fetchChildren();
    expect(child.measurements[0]).toEqual({
      id,
      date: '2025-02-02',
      weight: 4300,
      length: null,
      headCirc: 37.5
    });
  });

  it('rejects invalid values', async () => {
    await signedIn();
    const childId = await api.createChild(profile);
    await expect(
      api.createMeasurement(childId, { date: 'yesterday', weight: 4000 })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      api.createMeasurement(childId, { date: '2025-02-01', weight: -5 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('deletes a measurement', async () => {
    await signedIn();
    const childId = await api.createChild(profile);
    const id = await api.createMeasurement(childId, { date: '2025-02-01', weight: 4000 });
    await api.deleteMeasurement(id);
    const [child] = await api.fetchChildren();
    expect(child.measurements).toEqual([]);
  });
});

describe('isolation between users', () => {
  it("cannot see or change another user's children or measurements", async () => {
    const alice = await signedIn();
    const childId = await api.createChild(profile);
    const measurementId = await api.createMeasurement(childId, {
      date: '2025-02-01',
      weight: 4000
    });

    await signedIn();
    expect(await api.fetchChildren()).toEqual([]);
    await expect(api.updateChild(childId, { name: 'Hacked' })).rejects.toMatchObject({
      status: 404
    });
    await expect(api.deleteChild(childId)).rejects.toMatchObject({ status: 404 });
    await expect(
      api.createMeasurement(childId, { date: '2025-02-02', weight: 1 })
    ).rejects.toMatchObject({ status: 404 });
    await expect(api.updateMeasurement(measurementId, { weight: 1 })).rejects.toMatchObject({
      status: 404
    });
    await expect(api.deleteMeasurement(measurementId)).rejects.toMatchObject({ status: 404 });
    await expect(api.fetchShares(childId)).rejects.toMatchObject({ status: 404 });
    await expect(api.createShare(childId, 'x')).rejects.toMatchObject({ status: 404 });
    await expect(api.setActiveChildId(childId)).rejects.toMatchObject({ status: 404 });

    alice.browser.use();
    const [child] = await api.fetchChildren();
    expect(child.profile.name).toBe('Zosia');
    expect(child.measurements).toHaveLength(1);
  });
});

describe('preferences', () => {
  it('stores the active child', async () => {
    await signedIn();
    expect(await api.getActiveChildId()).toBeNull();

    const first = await api.createChild(profile);
    const second = await api.createChild(profile);
    await api.setActiveChildId(first);
    expect(await api.getActiveChildId()).toBe(first);
    await api.setActiveChildId(second);
    expect(await api.getActiveChildId()).toBe(second);
    await api.setActiveChildId(null);
    expect(await api.getActiveChildId()).toBeNull();
  });

  it('clears the active child when that child is deleted', async () => {
    await signedIn();
    const id = await api.createChild(profile);
    await api.setActiveChildId(id);
    await api.deleteChild(id);
    expect(await api.getActiveChildId()).toBeNull();
  });
});

describe('sharing', () => {
  /** Owner with a child that has one measurement and a share link */
  async function ownerWithShare(label = 'Doctor') {
    const owner = await signedIn();
    const childId = await api.createChild(profile);
    await api.createMeasurement(childId, { date: '2025-02-01', weight: 4000 });
    const share = await api.createShare(childId, label);
    return { owner, childId, share };
  }

  it('creates and lists share links', async () => {
    const { childId, share } = await ownerWithShare();
    expect(share).toMatchObject({ label: 'Doctor' });
    expect(share.token).toMatch(/^[0-9a-f]{32}$/);
    expect(await api.fetchShares(childId)).toEqual([share]);
  });

  it('does not let guests create share links', async () => {
    await signedIn({ saved: false });
    const childId = await api.createChild(profile);
    await expect(api.createShare(childId, 'x')).rejects.toMatchObject({ status: 403 });
  });

  it('gives the recipient read-only access with the share label', async () => {
    const { childId, share } = await ownerWithShare('Grandma');

    await signedIn({ saved: false });
    expect(await api.acceptShare(share.token)).toEqual({ childId, alreadyAccepted: false });
    expect(await api.acceptShare(share.token)).toEqual({ childId, alreadyAccepted: true });

    const shared = await api.fetchSharedChildren();
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({
      id: childId,
      profile,
      _shared: true,
      _shareLabel: 'Grandma'
    });
    expect(shared[0].measurements).toHaveLength(1);

    // Shared children don't show up as own children and can't be changed
    expect(await api.fetchChildren()).toEqual([]);
    await expect(api.updateChild(childId, { name: 'x' })).rejects.toMatchObject({ status: 404 });
    await expect(api.deleteChild(childId)).rejects.toMatchObject({ status: 404 });
    const measurementId = shared[0].measurements[0].id;
    await expect(api.updateMeasurement(measurementId, { weight: 1 })).rejects.toMatchObject({
      status: 404
    });

    // ...but can be the active child
    await api.setActiveChildId(childId);
    expect(await api.getActiveChildId()).toBe(childId);
  });

  it('sees live updates from the owner', async () => {
    const { owner, childId, share } = await ownerWithShare();
    const recipient = await signedIn();
    await api.acceptShare(share.token);

    owner.browser.use();
    await api.createMeasurement(childId, { date: '2025-03-01', weight: 5000 });

    recipient.browser.use();
    const [child] = await api.fetchSharedChildren();
    expect(child.measurements).toHaveLength(2);
  });

  it('rejects invalid tokens and the owner accepting their own share', async () => {
    const { share } = await ownerWithShare();
    await expect(api.acceptShare(share.token)).rejects.toMatchObject({ status: 400 });

    await signedIn();
    await expect(api.acceptShare('0'.repeat(32))).rejects.toMatchObject({ status: 404 });
  });

  it('lets the recipient remove a shared child', async () => {
    const { share } = await ownerWithShare();
    await signedIn();
    const { childId } = await api.acceptShare(share.token);

    await api.removeSharedChild(childId);
    expect(await api.fetchSharedChildren()).toEqual([]);
  });

  it('revoking a link removes access for everyone who accepted it', async () => {
    const { owner, childId, share } = await ownerWithShare();
    const recipient = await signedIn();
    await api.acceptShare(share.token);

    owner.browser.use();
    await api.revokeShare(share.id);
    expect(await api.fetchShares(childId)).toEqual([]);

    recipient.browser.use();
    expect(await api.fetchSharedChildren()).toEqual([]);
    await expect(api.acceptShare(share.token)).rejects.toMatchObject({ status: 404 });
  });

  it('only the owner can revoke a link', async () => {
    const { share } = await ownerWithShare();
    await signedIn();
    await expect(api.revokeShare(share.id)).rejects.toMatchObject({ status: 404 });
  });
});
