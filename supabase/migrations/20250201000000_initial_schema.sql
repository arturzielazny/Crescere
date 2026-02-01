-- Crescere Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Children table
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  sex SMALLINT NOT NULL CHECK (sex IN (1, 2)), -- 1=male, 2=female
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements table
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight INTEGER,          -- grams, nullable
  length NUMERIC(4,1),     -- cm, nullable
  head_circ NUMERIC(4,1),  -- cm, nullable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences (active child selection)
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_child_id UUID REFERENCES children(id) ON DELETE SET NULL
);

-- Indexes for query performance
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_measurements_child_id ON measurements(child_id);

-- Enable Row Level Security
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Children: users own their children
CREATE POLICY "Users own their children" ON children
  FOR ALL USING (auth.uid() = user_id);

-- Measurements: users own measurements of their children
CREATE POLICY "Users own their measurements" ON measurements
  FOR ALL USING (child_id IN (SELECT id FROM children WHERE user_id = auth.uid()));

-- Preferences: users own their preferences
CREATE POLICY "Users own their preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on children table
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
