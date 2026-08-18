alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('trial','ativo','cancelado','expirado','cortesia'));

update public.subscriptions s
set status = 'cortesia'
from auth.users u
where s.user_id = u.id
  and u.email in ('arthurdramos@outlook.com', 'felipetgk@gmail.com');