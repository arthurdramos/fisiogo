-- ========== subscriptions: status "cortesia" (acesso liberado sem cobrança) ==========
-- Pra contas internas/master (ex: sócios) que não devem passar pelo checkout.
-- Fica separado de "ativo" de propósito, pra não contar como cliente pagante em
-- métricas de receita. A concessão em si é manual: depois que a conta existir,
-- rode um UPDATE direto (não há política de UPDATE pro usuário comum — só
-- SELECT — então isso exige acesso de service_role/SQL editor):
--
--   update public.subscriptions s
--   set status = 'cortesia'
--   from auth.users u
--   where s.user_id = u.id
--     and u.email in ('email-1@exemplo.com', 'email-2@exemplo.com');
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'ativo', 'atrasado', 'cancelado', 'cortesia'));
