/**
 * Integration tests for auth flows against local Supabase.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

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

describe.skipIf(!(await isSupabaseRunning()))('Auth Integration Tests', () => {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const createdUserIds = [];

  afterAll(async () => {
    for (const uid of createdUserIds) {
      await adminClient.auth.admin.deleteUser(uid);
    }
  });

  /** Create a fresh anon-key client (no session contamination) */
  function freshClient() {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  it('anonymous sign-in creates a valid session', async () => {
    const client = freshClient();
    const { data, error } = await client.auth.signInAnonymously();
    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.session).toBeTruthy();
    createdUserIds.push(data.user.id);
  });

  it('sign up with email + password', async () => {
    const client = freshClient();
    const email = `test-signup-${Date.now()}@example.com`;

    const { data, error } = await client.auth.signUp({
      email,
      password: 'password123'
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(email);
    createdUserIds.push(data.user.id);
  });

  it('sign in with wrong password fails', async () => {
    const client1 = freshClient();
    const email = `test-wrongpw-${Date.now()}@example.com`;

    // Create account first
    const { data: signUpData } = await client1.auth.signUp({
      email,
      password: 'correctpassword'
    });
    createdUserIds.push(signUpData.user.id);

    // Try sign in with wrong password
    const client2 = freshClient();
    const { error } = await client2.auth.signInWithPassword({
      email,
      password: 'wrongpassword'
    });

    expect(error).toBeTruthy();
  });

  it('sign in with correct password succeeds', async () => {
    const client1 = freshClient();
    const email = `test-correctpw-${Date.now()}@example.com`;

    // Create account
    const { data: signUpData } = await client1.auth.signUp({
      email,
      password: 'mypassword456'
    });
    createdUserIds.push(signUpData.user.id);

    // Sign in with correct password
    const client2 = freshClient();
    const { data, error } = await client2.auth.signInWithPassword({
      email,
      password: 'mypassword456'
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(email);
  });

  it('claim anonymous account with email + password, then sign back in', async () => {
    const client = freshClient();

    // Start anonymous
    const { data: anonData } = await client.auth.signInAnonymously();
    const anonId = anonData.user.id;
    createdUserIds.push(anonId);

    const email = `test-claim-${Date.now()}@example.com`;

    // Claim with email + password
    const { error: claimError } = await client.auth.updateUser({
      email,
      password: 'claimpassword'
    });
    expect(claimError).toBeNull();

    // Sign back in with the claimed credentials
    const client2 = freshClient();
    const { data, error } = await client2.auth.signInWithPassword({
      email,
      password: 'claimpassword'
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user.id).toBe(anonId);
  });

  it('set/update password, then sign in with new password', async () => {
    const client = freshClient();
    const email = `test-setpw-${Date.now()}@example.com`;

    // Create account with initial password
    const { data: signUpData } = await client.auth.signUp({
      email,
      password: 'initialpass'
    });
    createdUserIds.push(signUpData.user.id);

    // Update password
    const { error: updateError } = await client.auth.updateUser({
      password: 'newpassword'
    });
    expect(updateError).toBeNull();

    // Sign in with new password
    const client2 = freshClient();
    const { data, error } = await client2.auth.signInWithPassword({
      email,
      password: 'newpassword'
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
  });

  it('Supabase rejects passwords shorter than 6 characters', async () => {
    const client = freshClient();
    const email = `test-shortpw-${Date.now()}@example.com`;

    const { data, error } = await client.auth.signUp({
      email,
      password: '12345'
    });

    // Supabase should reject passwords < 6 chars
    expect(error).toBeTruthy();
    expect(data.user).toBeFalsy();
  });
});
