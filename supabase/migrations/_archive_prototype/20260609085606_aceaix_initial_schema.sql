
-- ============================================================
-- AceAiX Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('athlete', 'scout', 'club', 'medical_partner', 'federation', 'admin', 'guest');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'elite', 'enterprise');
CREATE TYPE media_type_enum AS ENUM ('video', 'image', 'highlight_reel', 'document');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE clearance_status AS ENUM ('cleared', 'restricted', 'not_cleared', 'pending');

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'athlete',
  full_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url VARCHAR(1000),
  phone VARCHAR(50),
  bio TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  subscription_tier subscription_tier DEFAULT 'free',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_profiles_delete_own" ON user_profiles FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- ATHLETE PROFILES
-- ============================================================
CREATE TABLE athlete_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  sport VARCHAR(100),
  position_primary VARCHAR(100),
  position_secondary VARCHAR(100),
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  birth_date DATE,
  nationality VARCHAR(100),
  dominant_foot VARCHAR(20),
  current_club VARCHAR(255),
  level VARCHAR(50) DEFAULT 'amateur',
  bio TEXT,
  is_open_to_offers BOOLEAN DEFAULT TRUE,
  visibility_score INTEGER DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,
  highlighted_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete_profiles_select_all" ON athlete_profiles FOR SELECT USING (true);
CREATE POLICY "athlete_profiles_insert_own" ON athlete_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "athlete_profiles_update_own" ON athlete_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "athlete_profiles_delete_own" ON athlete_profiles FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  logo_url VARCHAR(1000),
  description TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  website VARCHAR(500),
  is_verified BOOLEAN DEFAULT FALSE,
  founded_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select_all" ON organizations FOR SELECT USING (true);
CREATE POLICY "organizations_insert_auth" ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_update_auth" ON organizations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_delete_auth" ON organizations FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- ATHLETE MEDIA
-- ============================================================
CREATE TABLE athlete_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_type media_type_enum NOT NULL DEFAULT 'video',
  file_url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),
  duration_seconds INTEGER,
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,
  ai_tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE athlete_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete_media_select_public" ON athlete_media FOR SELECT USING (is_public = true OR auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "athlete_media_insert_own" ON athlete_media FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "athlete_media_update_own" ON athlete_media FOR UPDATE USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "athlete_media_delete_own" ON athlete_media FOR DELETE USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));

-- ============================================================
-- MATCH RECORDS & PERFORMANCE
-- ============================================================
CREATE TABLE match_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  opponent VARCHAR(255),
  competition VARCHAR(255),
  result VARCHAR(20),
  minutes_played INTEGER,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  stats JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_records_select_all" ON match_records FOR SELECT USING (true);
CREATE POLICY "match_records_insert_own" ON match_records FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "match_records_update_own" ON match_records FOR UPDATE USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "match_records_delete_own" ON match_records FOR DELETE USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));

-- ============================================================
-- MEDICAL RECORDS & CLEARANCES
-- ============================================================
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  record_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  document_url VARCHAR(1000),
  record_date DATE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  hash VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_records_select_own" ON medical_records FOR SELECT USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id));
CREATE POLICY "medical_records_insert_own" ON medical_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "medical_records_update_own" ON medical_records FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "medical_records_delete_own" ON medical_records FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TABLE medical_clearances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  status clearance_status NOT NULL DEFAULT 'pending',
  issued_by VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medical_clearances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_clearances_select_own" ON medical_clearances FOR SELECT USING (auth.uid() = (SELECT user_id FROM athlete_profiles WHERE id = athlete_id) OR auth.uid() IS NOT NULL);
CREATE POLICY "medical_clearances_insert_auth" ON medical_clearances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "medical_clearances_update_auth" ON medical_clearances FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "medical_clearances_delete_auth" ON medical_clearances FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- ENDORSEMENTS
-- ============================================================
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  endorser_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  skill_or_trait VARCHAR(255) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "endorsements_select_all" ON endorsements FOR SELECT USING (true);
CREATE POLICY "endorsements_insert_auth" ON endorsements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "endorsements_update_own" ON endorsements FOR UPDATE USING (auth.uid() = endorser_id);
CREATE POLICY "endorsements_delete_own" ON endorsements FOR DELETE USING (auth.uid() = endorser_id);

-- ============================================================
-- WATCHLISTS
-- ============================================================
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlists_select_own" ON watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlists_insert_own" ON watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_update_own" ON watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlists_delete_own" ON watchlists FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE watchlist_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  rating INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(watchlist_id, athlete_id)
);

ALTER TABLE watchlist_athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist_athletes_select_own" ON watchlist_athletes FOR SELECT USING (auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id));
CREATE POLICY "watchlist_athletes_insert_own" ON watchlist_athletes FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id));
CREATE POLICY "watchlist_athletes_update_own" ON watchlist_athletes FOR UPDATE USING (auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id));
CREATE POLICY "watchlist_athletes_delete_own" ON watchlist_athletes FOR DELETE USING (auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id));

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES user_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50),
  location VARCHAR(255),
  sport VARCHAR(100),
  position VARCHAR(100),
  salary_min DECIMAL(12,2),
  salary_max DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  application_deadline DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities_select_all" ON opportunities FOR SELECT USING (true);
CREATE POLICY "opportunities_insert_auth" ON opportunities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opportunities_update_own" ON opportunities FOR UPDATE USING (auth.uid() = created_by_id);
CREATE POLICY "opportunities_delete_own" ON opportunities FOR DELETE USING (auth.uid() = created_by_id);

-- ============================================================
-- MESSAGES & CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);
CREATE POLICY "conversations_insert_auth" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conversations_update_own" ON conversations FOR UPDATE USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);
CREATE POLICY "conversations_delete_own" ON conversations FOR DELETE USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (auth.uid() = (SELECT participant_1_id FROM conversations WHERE id = conversation_id) OR auth.uid() = (SELECT participant_2_id FROM conversations WHERE id = conversation_id));
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_own" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "messages_delete_own" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AI CHAT
-- ============================================================
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  context_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_chat_sessions_select_own" ON ai_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_sessions_insert_own" ON ai_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_chat_sessions_update_own" ON ai_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_sessions_delete_own" ON ai_chat_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  sender_role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_chat_messages_select_own" ON ai_chat_messages FOR SELECT USING (auth.uid() = (SELECT user_id FROM ai_chat_sessions WHERE id = session_id));
CREATE POLICY "ai_chat_messages_insert_own" ON ai_chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ai_chat_messages_update_own" ON ai_chat_messages FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ai_chat_messages_delete_own" ON ai_chat_messages FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- SUCCESS STORIES
-- ============================================================
CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  athlete_name VARCHAR(255),
  sport VARCHAR(100),
  cover_image_url VARCHAR(1000),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "success_stories_select_all" ON success_stories FOR SELECT USING (true);
CREATE POLICY "success_stories_insert_auth" ON success_stories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "success_stories_update_auth" ON success_stories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "success_stories_delete_auth" ON success_stories FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athlete_profiles_updated_at BEFORE UPDATE ON athlete_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_athlete_profiles_sport ON athlete_profiles(sport);
CREATE INDEX idx_athlete_profiles_user_id ON athlete_profiles(user_id);
CREATE INDEX idx_athlete_media_athlete_id ON athlete_media(athlete_id);
CREATE INDEX idx_match_records_athlete_id ON match_records(athlete_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_watchlist_athletes_watchlist_id ON watchlist_athletes(watchlist_id);
