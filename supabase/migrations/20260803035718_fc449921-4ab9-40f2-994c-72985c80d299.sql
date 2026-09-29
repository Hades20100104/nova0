DROP POLICY IF EXISTS profiles_public_username_search ON public.profiles;

CREATE OR REPLACE FUNCTION public.shares_room_with(_other uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members a
    JOIN public.chat_members b ON a.room_id = b.room_id
    WHERE a.user_id = _user AND b.user_id = _other
  )
$$;

CREATE POLICY "Profiles: select room peers"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_room_with(id, auth.uid()));

CREATE OR REPLACE FUNCTION public.search_profiles(_term text)
RETURNS TABLE (id uuid, username text, display_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(btrim(_term)) >= 2
    AND (p.username ILIKE '%' || btrim(_term) || '%' OR p.display_name ILIKE '%' || btrim(_term) || '%')
  ORDER BY p.username NULLS LAST
  LIMIT 15
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
REVOKE ALL ON FUNCTION public.shares_room_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_room_with(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_room_attachment(_object_name text, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_messages m
    JOIN public.chat_members cm ON cm.room_id = m.room_id AND cm.user_id = _user
    WHERE m.attachments::text LIKE '%' || _object_name || '%'
  )
$$;

REVOKE ALL ON FUNCTION public.can_read_room_attachment(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_room_attachment(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "room members read chat-attachments" ON storage.objects;
CREATE POLICY "room members read chat-attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_read_room_attachment(name, auth.uid())
);