-- ========== ensure_professional_profile: adiciona nome do terapeuta ==========
-- Troca de assinatura (novo parâmetro _nome), então a função anterior
-- precisa ser removida antes de recriar.
DROP FUNCTION IF EXISTS public.ensure_professional_profile(uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION public.ensure_professional_profile(
  _user_id uuid,
  _nome text,
  _crefito text,
  _telefone text,
  _lgpd_aceite boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.professional_profile (user_id, nome, crefito, telefone, lgpd_aceite_em)
  VALUES (_user_id, _nome, _crefito, _telefone, CASE WHEN _lgpd_aceite THEN now() ELSE NULL END)
  ON CONFLICT (user_id) DO NOTHING;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_professional_profile(uuid, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_professional_profile(uuid, text, text, text, boolean) TO service_role;
