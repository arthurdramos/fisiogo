-- Marca quando (se já) o e-mail de reengajamento (48h sem nenhum paciente
-- cadastrado) foi enviado pra essa assinatura, pra não mandar duas vezes.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS reengagement_email_sent_at timestamptz;
