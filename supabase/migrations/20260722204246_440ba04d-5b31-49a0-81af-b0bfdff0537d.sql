REVOKE EXECUTE ON FUNCTION public.is_room_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_room_owner(UUID, UUID) FROM PUBLIC, anon, authenticated;