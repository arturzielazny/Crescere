/**
 * API functions for Supabase CRUD operations
 * Handles children, measurements, and user preferences
 */

import { supabase } from './supabaseClient.js';

// ============================================================================
// Children
// ============================================================================

/**
 * Fetch all children for the current user
 * @returns {Promise<Array>} Array of children with their measurements
 */
export async function fetchChildren() {
  const { data, error } = await supabase
    .from('children')
    .select(
      `
      id,
      name,
      birth_date,
      sex,
      measurements (
        id,
        date,
        weight,
        length,
        head_circ
      )
    `
    )
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Transform to app format
  return (data || []).map(transformChildFromDb);
}

/**
 * Create a new child
 * @param {Object} profile - { name, birthDate, sex }
 * @returns {Promise<string>} Created child ID
 */
export async function createChild(profile) {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('children')
    .insert({
      user_id: user.id,
      name: profile.name || '',
      birth_date: profile.birthDate,
      sex: profile.sex
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Update child profile
 * @param {string} id - Child ID
 * @param {Object} profile - { name?, birthDate?, sex? }
 */
export async function updateChild(id, profile) {
  const updates = {};
  if (profile.name !== undefined) updates.name = profile.name;
  if (profile.birthDate !== undefined) updates.birth_date = profile.birthDate;
  if (profile.sex !== undefined) updates.sex = profile.sex;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('children').update(updates).eq('id', id);

  if (error) throw error;
}

/**
 * Delete a child and all their measurements (cascade)
 * @param {string} id - Child ID
 */
export async function deleteChild(id) {
  const { error } = await supabase.from('children').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Measurements
// ============================================================================

/**
 * Create a measurement for a child
 * @param {string} childId - Child ID
 * @param {Object} measurement - { date, weight?, length?, headCirc? }
 * @returns {Promise<string>} Created measurement ID
 */
export async function createMeasurement(childId, measurement) {
  const { data, error } = await supabase
    .from('measurements')
    .insert({
      child_id: childId,
      date: measurement.date,
      weight: measurement.weight,
      length: measurement.length,
      head_circ: measurement.headCirc
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Update a measurement
 * @param {string} id - Measurement ID
 * @param {Object} updates - { date?, weight?, length?, headCirc? }
 */
export async function updateMeasurement(id, updates) {
  const dbUpdates = {};
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
  if (updates.length !== undefined) dbUpdates.length = updates.length;
  if (updates.headCirc !== undefined) dbUpdates.head_circ = updates.headCirc;

  if (Object.keys(dbUpdates).length === 0) return;

  const { error } = await supabase.from('measurements').update(dbUpdates).eq('id', id);

  if (error) throw error;
}

/**
 * Delete a measurement
 * @param {string} id - Measurement ID
 */
export async function deleteMeasurement(id) {
  const { error } = await supabase.from('measurements').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * Get the active child ID for current user
 * @returns {Promise<string|null>} Active child ID or null
 */
export async function getActiveChildId() {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('active_child_id')
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data?.active_child_id || null;
}

/**
 * Set the active child ID for current user
 * @param {string|null} childId - Child ID or null to clear
 */
export async function setActiveChildId(childId) {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      active_child_id: childId
    },
    {
      onConflict: 'user_id'
    }
  );

  if (error) throw error;
}

// ============================================================================
// Bulk Operations (for migration)
// ============================================================================

/**
 * Import a complete child with measurements
 * Used for localStorage migration
 * @param {Object} child - Full child object with measurements array
 * @returns {Promise<string>} Created child ID
 */
export async function importChild(child) {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert child
  const { data: childData, error: childError } = await supabase
    .from('children')
    .insert({
      user_id: user.id,
      name: child.profile?.name || '',
      birth_date: child.profile?.birthDate,
      sex: child.profile?.sex
    })
    .select('id')
    .single();

  if (childError) throw childError;

  // Insert measurements if any
  if (child.measurements?.length > 0) {
    const measurements = child.measurements.map((m) => ({
      child_id: childData.id,
      date: m.date,
      weight: m.weight,
      length: m.length,
      head_circ: m.headCirc
    }));

    const { error: measurementError } = await supabase.from('measurements').insert(measurements);

    if (measurementError) throw measurementError;
  }

  return childData.id;
}

// ============================================================================
// Sharing
// ============================================================================

/**
 * Generate a URL-safe random token (22 chars, 128-bit)
 * @returns {string}
 */
export function generateToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to hex string (32 chars, URL-safe)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a named share link for a child
 * @param {string} childId - Child ID
 * @param {string} label - Human-readable label (e.g., "Doctor")
 * @returns {Promise<{id: string, token: string, label: string, created_at: string}>}
 */
export async function createShare(childId, label) {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const token = generateToken();

  const { data, error } = await supabase
    .from('child_shares')
    .insert({
      child_id: childId,
      owner_id: user.id,
      token,
      label: label || ''
    })
    .select('id, token, label, created_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * List all shares for a child (owner only via RLS)
 * @param {string} childId - Child ID
 * @returns {Promise<Array>}
 */
export async function fetchShares(childId) {
  const { data, error } = await supabase
    .from('child_shares')
    .select('id, token, label, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Revoke a share (cascade deletes access rows)
 * @param {string} shareId - Share ID
 */
export async function revokeShare(shareId) {
  const { error } = await supabase.from('child_shares').delete().eq('id', shareId);

  if (error) throw error;
}

/**
 * Accept a share via token (calls SECURITY DEFINER RPC)
 * @param {string} token - Share token
 * @returns {Promise<{child_id: string, already_accepted: boolean}>}
 */
export async function acceptShare(token) {
  const { data, error } = await supabase.rpc('accept_share', { share_token: token });

  if (error) throw error;
  return data;
}

/**
 * Fetch all children shared with the current user
 * Returns children in app format with _shared and _shareLabel markers
 * @returns {Promise<Array>}
 */
export async function fetchSharedChildren() {
  // Get access rows for current user
  const { data: accessRows, error: accessError } = await supabase
    .from('shared_child_access')
    .select('child_id, share_id');

  if (accessError) throw accessError;
  if (!accessRows || accessRows.length === 0) return [];

  const childIds = accessRows.map((a) => a.child_id);

  // Fetch the actual children with measurements
  const { data: children, error: childError } = await supabase
    .from('children')
    .select(
      `
      id,
      name,
      birth_date,
      sex,
      measurements (
        id,
        date,
        weight,
        length,
        head_circ
      )
    `
    )
    .in('id', childIds);

  if (childError) throw childError;

  // Fetch share labels
  const shareIds = accessRows.map((a) => a.share_id);
  const { data: shares } = await supabase
    .from('child_shares')
    .select('id, label')
    .in('id', shareIds);

  const shareLabelMap = {};
  if (shares) {
    for (const s of shares) {
      shareLabelMap[s.id] = s.label;
    }
  }

  // Build access-to-label map
  const childLabelMap = {};
  for (const a of accessRows) {
    childLabelMap[a.child_id] = shareLabelMap[a.share_id] || '';
  }

  return (children || []).map((child) => ({
    ...transformChildFromDb(child),
    _shared: true,
    _shareLabel: childLabelMap[child.id] || ''
  }));
}

/**
 * Remove the current user's access to a shared child
 * @param {string} childId - Child ID
 */
export async function removeSharedChild(childId) {
  const { error } = await supabase.from('shared_child_access').delete().eq('child_id', childId);

  if (error) throw error;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform child from database format to app format
 */
function transformChildFromDb(dbChild) {
  return {
    id: dbChild.id,
    profile: {
      name: dbChild.name,
      birthDate: dbChild.birth_date,
      sex: dbChild.sex
    },
    measurements: (dbChild.measurements || []).map(transformMeasurementFromDb)
  };
}

/**
 * Transform measurement from database format to app format
 */
function transformMeasurementFromDb(dbMeasurement) {
  return {
    id: dbMeasurement.id,
    date: dbMeasurement.date,
    weight: dbMeasurement.weight,
    length: dbMeasurement.length ? Number(dbMeasurement.length) : null,
    headCirc: dbMeasurement.head_circ ? Number(dbMeasurement.head_circ) : null
  };
}
