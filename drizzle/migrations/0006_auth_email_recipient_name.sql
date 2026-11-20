CREATE OR REPLACE FUNCTION public.get_auth_email_recipient_name(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT nullif(btrim(raw_user_meta_data->>'nome'), '')
  FROM auth.users
  WHERE lower(email) = lower(_email)
  ORDER BY created_at DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_auth_email_recipient_name(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_email_recipient_name(text) TO service_role;