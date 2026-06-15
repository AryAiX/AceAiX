-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'colleague',
  body TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(author_id, recipient_id),
  CONSTRAINT no_self_recommend CHECK (author_id <> recipient_id)
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations_select_public" ON recommendations FOR SELECT USING (is_public = true OR auth.uid() = author_id OR auth.uid() = recipient_id);
CREATE POLICY "recommendations_insert_auth" ON recommendations FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "recommendations_update_own" ON recommendations FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "recommendations_delete_own" ON recommendations FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX idx_recommendations_recipient ON recommendations(recipient_id);
CREATE INDEX idx_recommendations_author ON recommendations(author_id);
