ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IS NULL OR provider IN ('mercadopago', 'cakto'));