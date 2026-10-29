CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE public.session_reminder_scheduler_credentials (id boolean PRIMARY KEY DEFAULT true CHECK (id = true), token text NOT NULL);
GRANT SELECT ON public.session_reminder_scheduler_credentials TO service_role;
ALTER TABLE public.session_reminder_scheduler_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.session_reminder_scheduler_credentials FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.verify_session_reminder_key(candidate text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.session_reminder_scheduler_credentials WHERE token = candidate AND candidate IS NOT NULL); $$;
REVOKE ALL ON FUNCTION public.verify_session_reminder_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_session_reminder_key(text) TO service_role;