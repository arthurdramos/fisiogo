-- De onde veio cada cadastro: UTMs e site de origem da primeira visita
-- (capturados no navegador por src/lib/attribution.ts) gravados pela Edge
-- Function ensure-professional-profile no primeiro acesso autenticado.
-- Uma linha por profissional, nunca sobrescrita.
--
-- Dado interno de marketing: RLS ligado e nenhuma policy, então só o
-- service_role (Edge Function) e consultas SQL no painel acessam.

CREATE TABLE IF NOT EXISTS public.signup_attribution (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_path text,
  provider text,
  first_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_attribution FROM anon, authenticated;
