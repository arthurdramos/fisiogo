-- ========== professional_profile: aceite dos termos (LGPD) ==========
ALTER TABLE public.professional_profile
  ADD COLUMN lgpd_aceite_em timestamptz;

-- ========== ensure_professional_profile ==========
-- Cria a linha em professional_profile a partir dos dados informados no
-- cadastro (crefito, telefone, aceite LGPD), gravados em auth.users como
-- metadata no signUp. Não é possível criar trigger direto em auth.users em
-- bancos gerenciados (Lovable Cloud/Supabase hosted) — por isso essa função
-- é SECURITY DEFINER restrita a service_role, chamada pela Edge Function
-- ensure-professional-profile logo no primeiro acesso autenticado
-- (ver _authenticated/route.tsx), mesmo padrão do ensure_subscription.
CREATE OR REPLACE FUNCTION public.ensure_professional_profile(
  _user_id uuid,
  _crefito text,
  _telefone text,
  _lgpd_aceite boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.professional_profile (user_id, crefito, telefone, lgpd_aceite_em)
  VALUES (_user_id, _crefito, _telefone, CASE WHEN _lgpd_aceite THEN now() ELSE NULL END)
  ON CONFLICT (user_id) DO NOTHING;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_professional_profile(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_professional_profile(uuid, text, text, boolean) TO service_role;
