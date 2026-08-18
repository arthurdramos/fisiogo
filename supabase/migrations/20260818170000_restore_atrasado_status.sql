-- Uma migration feita direto no editor do Lovable trocou a lista de status
-- válidos e removeu 'atrasado', substituindo por 'expirado'. Isso quebra o
-- mp-webhook (supabase/functions/mp-webhook/index.ts), que grava
-- status = 'atrasado' quando a assinatura no Mercado Pago fica "paused"
-- (pagamento atrasado) — sem 'atrasado' na lista, esse update passaria a
-- falhar por violar o CHECK constraint. Restaura 'atrasado' mantendo
-- 'expirado' e 'cortesia'.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'ativo', 'atrasado', 'cancelado', 'expirado', 'cortesia'));
