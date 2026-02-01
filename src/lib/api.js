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
