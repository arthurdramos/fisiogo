ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS cakto_subscription_id text;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial','ativo','atrasado','cancelado','expirado','cortesia'));

CREATE TABLE IF NOT EXISTS public.cakto_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  cakto_order_id text,
  email text,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cakto_webhook_events TO service_role;

ALTER TABLE public.cakto_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;