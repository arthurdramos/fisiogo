REVOKE EXECUTE ON FUNCTION public.ensure_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_subscription(uuid) TO service_role;