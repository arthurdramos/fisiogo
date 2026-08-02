-- ========== subscriptions (trial + assinatura via Mercado Pago) ==========
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','ativo','atrasado','cancelado')),
  plano text CHECK (plano IN ('mensal','anual')),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  mp_preapproval_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Só o próprio usuário lê sua assinatura. Escrita fica restrita ao service_role
-- (as Edge Functions), então usuários não conseguem se auto-liberar acesso.
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bancos gerenciados (Lovable Cloud/Supabase hosted) não permitem criar
-- trigger direto em auth.users, então a garantia do trial de 7 dias não
-- acontece via trigger automático: esta função (SECURITY DEFINER, restrita
-- a service_role) é chamada pela Edge Function ensure-subscription logo na
-- primeira vez que o usuário aparece sem assinatura (ver _authenticated/route.tsx).
CREATE OR REPLACE FUNCTION public.ensure_subscription(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.subscriptions (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

-- Backfill: usuários que já existiam antes dessa migration também ganham trial
INSERT INTO public.subscriptions (user_id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id);
