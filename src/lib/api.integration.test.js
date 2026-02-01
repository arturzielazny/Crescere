/**
 * Integration tests for Supabase API
 *
 * These tests run against a real local Supabase instance.
 * Skip these tests if Docker/Supabase is not running.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Local Supabase credentials (from `supabase status`)
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Service role key for cleanup (bypasses RLS)
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

let supabase;
let adminClient;
let testUserId;

// Check if Supabase is running
async function isSupabaseRunning() {
  try {
    const response = await globalThis.fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON_KEY }
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe.skipIf(!(await isSupabaseRunning()))('API Integration Tests', () => {
  beforeAll(async () => {
    // Create clients
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Sign in anonymously to get a test user
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    testUserId = data.user.id;
  });

  afterAll(async () => {
    // Clean up test user and all their data
    if (testUserId) {
      // Delete children (cascades to measurements)
      await adminClient.from('children').delete().eq('user_id', testUserId);
      await adminClient.from('user_preferences').delete().eq('user_id', testUserId);
    }
    await supabase.auth.signOut();
  });

  beforeEach(async () => {
    // Clean up between tests
    await adminClient.from('children').delete().eq('user_id', testUserId);
    await adminClient.from('user_preferences').delete().eq('user_id', testUserId);
  });

  describe('Children CRUD', () => {
    it('creates a child', async () => {
      const { data, error } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Test Child',
          birth_date: '2024-01-15',
          sex: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Child');
      expect(data.sex).toBe(1);
    });

    it('fetches children with measurements', async () => {
      // Create a child
      const { data: child } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Test Child',
          birth_date: '2024-01-15',
          sex: 2
        })
        .select()
        .single();

      // Add measurements
      await supabase.from('measurements').insert([
        { child_id: child.id, date: '2024-02-15', weight: 4500, length: 55 },
        { child_id: child.id, date: '2024-03-15', weight: 5200, length: 58 }
      ]);

      // Fetch with measurements
      const { data: children, error } = await supabase
        .from('children')
        .select(`*, measurements (*)`)
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(children).toHaveLength(1);
      expect(children[0].measurements).toHaveLength(2);
    });

    it('enforces RLS - cannot see other users children', async () => {
      // Create a child with admin (different user_id)
      const { data: otherChild } = await adminClient
        .from('children')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000001', // Different user
          name: 'Other User Child',
          birth_date: '2024-01-01',
          sex: 1
        })
        .select()
        .single();

      // Try to fetch as test user
      const { data: children } = await supabase.from('children').select().eq('id', otherChild.id);

      expect(children).toHaveLength(0); // RLS blocks access

      // Cleanup
      await adminClient.from('children').delete().eq('id', otherChild.id);
    });

    it('cascades delete to measurements', async () => {
      // Create child with measurements
      const { data: child } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Delete Test',
          birth_date: '2024-01-15',
          sex: 1
        })
        .select()
        .single();

      await supabase
        .from('measurements')
        .insert({ child_id: child.id, date: '2024-02-15', weight: 4000 });

      // Delete child
      await supabase.from('children').delete().eq('id', child.id);

      // Verify measurements are gone
      const { data: measurements } = await adminClient
        .from('measurements')
        .select()
        .eq('child_id', child.id);

      expect(measurements).toHaveLength(0);
    });
  });

  describe('Measurements CRUD', () => {
    let childId;

    beforeEach(async () => {
      // Create a child for measurement tests
      const { data } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Measurement Test Child',
          birth_date: '2024-01-01',
          sex: 1
        })
        .select()
        .single();
      childId = data.id;
    });

    it('creates a measurement with all fields', async () => {
      const { data, error } = await supabase
        .from('measurements')
        .insert({
          child_id: childId,
          date: '2024-02-01',
          weight: 4200,
          length: 53.5,
          head_circ: 36.0
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.weight).toBe(4200);
      expect(Number(data.length)).toBe(53.5);
      expect(Number(data.head_circ)).toBe(36.0);
    });

    it('allows null for optional measurements', async () => {
      const { data, error } = await supabase
        .from('measurements')
        .insert({
          child_id: childId,
          date: '2024-02-01',
          weight: 4200,
          length: null,
          head_circ: null
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.weight).toBe(4200);
      expect(data.length).toBeNull();
      expect(data.head_circ).toBeNull();
    });

    it('updates a measurement', async () => {
      const { data: created } = await supabase
        .from('measurements')
        .insert({ child_id: childId, date: '2024-02-01', weight: 4200 })
        .select()
        .single();

      const { error } = await supabase
        .from('measurements')
        .update({ weight: 4300 })
        .eq('id', created.id);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('measurements')
        .select()
        .eq('id', created.id)
        .single();

      expect(updated.weight).toBe(4300);
    });
  });

  describe('User Preferences', () => {
    it('upserts active child preference', async () => {
      // Create a child
      const { data: child } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Pref Test',
          birth_date: '2024-01-01',
          sex: 1
        })
        .select()
        .single();

      // Set preference
      const { error: insertError } = await supabase
        .from('user_preferences')
        .upsert({ user_id: testUserId, active_child_id: child.id }, { onConflict: 'user_id' });

      expect(insertError).toBeNull();

      // Verify
      const { data: pref } = await supabase
        .from('user_preferences')
        .select()
        .eq('user_id', testUserId)
        .single();

      expect(pref.active_child_id).toBe(child.id);

      // Update preference (upsert again)
      const { data: child2 } = await supabase
        .from('children')
        .insert({
          user_id: testUserId,
          name: 'Second Child',
          birth_date: '2024-02-01',
          sex: 2
        })
        .select()
        .single();

      await supabase
        .from('user_preferences')
        .upsert({ user_id: testUserId, active_child_id: child2.id }, { onConflict: 'user_id' });

      const { data: updatedPref } = await supabase
        .from('user_preferences')
        .select()
        .eq('user_id', testUserId)
        .single();

      expect(updatedPref.active_child_id).toBe(child2.id);
    });
  });
});
