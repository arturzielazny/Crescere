-- Child Sharing: Live persistent sharing via tokens
-- Parents create named shares; recipients accept to get read-only access

-- ============================================================================
-- Tables
-- ============================================================================

-- Each named share link created by a parent
CREATE TABLE child_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks which users accepted which share (read-only access)
CREATE TABLE shared_child_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES child_shares(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, child_id)
);

-- Indexes
CREATE INDEX idx_child_shares_child_id ON child_shares(child_id);
CREATE INDEX idx_child_shares_owner_id ON child_shares(owner_id);
CREATE INDEX idx_child_shares_token ON child_shares(token);
CREATE INDEX idx_shared_child_access_user_id ON shared_child_access(user_id);
CREATE INDEX idx_shared_child_access_child_id ON shared_child_access(child_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE child_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_child_access ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own shares
CREATE POLICY "Owners manage their shares" ON child_shares
  FOR ALL USING (auth.uid() = owner_id);

-- Users can view and delete their own access rows
CREATE POLICY "Users manage their access" ON shared_child_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete their access" ON shared_child_access
  FOR DELETE USING (auth.uid() = user_id);

-- Recipients can SELECT shared children (extends existing children RLS)
CREATE POLICY "Recipients can view shared children" ON children
  FOR SELECT USING (
    id IN (SELECT child_id FROM shared_child_access WHERE user_id = auth.uid())
  );

-- Recipients can SELECT measurements of shared children
CREATE POLICY "Recipients can view shared measurements" ON measurements
  FOR SELECT USING (
    child_id IN (SELECT child_id FROM shared_child_access WHERE user_id = auth.uid())
  );

-- ============================================================================
-- RPC: accept_share(token) — SECURITY DEFINER so it can read child_shares
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_share(share_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
  v_user_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the share by token
  SELECT id, child_id, owner_id INTO v_share
  FROM child_shares
  WHERE token = share_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid share token';
  END IF;

  -- Don't allow owner to accept their own share
  IF v_share.owner_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own share';
  END IF;

  -- Check if already accepted
  SELECT id INTO v_existing
  FROM shared_child_access
  WHERE user_id = v_user_id AND child_id = v_share.child_id;

  IF FOUND THEN
    RETURN json_build_object('child_id', v_share.child_id, 'already_accepted', true);
  END IF;

  -- Create access row
  INSERT INTO shared_child_access (user_id, child_id, share_id)
  VALUES (v_user_id, v_share.child_id, v_share.id);

  RETURN json_build_object('child_id', v_share.child_id, 'already_accepted', false);
END;
$$;
