-- Profiles: username for @search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (lower(username));

-- Rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('dm','group')),
  name TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_assistant TEXT CHECK (ai_assistant IN ('nova','nevira')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT ALL ON public.chat_rooms TO service_role;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE IF NOT EXISTS public.chat_members (
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_members TO authenticated;
GRANT ALL ON public.chat_members TO service_role;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_room_member(_room UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = _room AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(_room UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = _room AND user_id = _user AND role = 'owner')
$$;

-- Messages
CREATE TABLE IF NOT EXISTS public.chat_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL DEFAULT 'user' CHECK (sender_kind IN ('user','ai','system')),
  ai_name TEXT,
  body TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_room_messages_room_idx ON public.chat_room_messages (room_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_room_messages TO authenticated;
GRANT ALL ON public.chat_room_messages TO service_role;
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "rooms_select_members" ON public.chat_rooms FOR SELECT TO authenticated
  USING (public.is_room_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "rooms_insert_own" ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "rooms_update_owner" ON public.chat_rooms FOR UPDATE TO authenticated
  USING (public.is_room_owner(id, auth.uid())) WITH CHECK (public.is_room_owner(id, auth.uid()));
CREATE POLICY "rooms_delete_owner" ON public.chat_rooms FOR DELETE TO authenticated
  USING (public.is_room_owner(id, auth.uid()));

CREATE POLICY "members_select_own_rooms" ON public.chat_members FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "members_insert_by_owner_or_self" ON public.chat_members FOR INSERT TO authenticated
  WITH CHECK (public.is_room_owner(room_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "members_delete_self_or_owner" ON public.chat_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "messages_select_members" ON public.chat_room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "messages_insert_members" ON public.chat_room_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_room_member(room_id, auth.uid()) AND (sender_kind <> 'user' OR sender_id = auth.uid()));

-- Allow searching other users by username via profiles (public.profiles usually has strict RLS)
DROP POLICY IF EXISTS "profiles_public_username_search" ON public.profiles;
CREATE POLICY "profiles_public_username_search" ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Realtime publication
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_room_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- updated_at trigger for rooms
DROP TRIGGER IF EXISTS chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();