-- ensure_subscription agora retorna se de fato criou a linha de trial (true)
-- ou se o usuário já tinha assinatura (false, ON CONFLICT DO NOTHING).
-- A Edge Function ensure-subscription usa esse retorno pra disparar o
-- e-mail de boas-vindas só na primeira vez, mesmo se for chamada de novo
-- (ex: duas abas abertas simultaneamente no primeiro acesso).
CREATE OR REPLACE FUNCTION public.ensure_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO public.subscriptions (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM ins);
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_subscription(uuid) TO service_role;
