-- Lembrete de sessão para o paciente: o profissional envia pelo próprio
-- WhatsApp (link wa.me com mensagem pronta) e o paciente responde por um link
-- público, sem login. O token é o único "segredo" do link — 128 bits
-- aleatórios, então não dá pra adivinhar o de outra sessão.

-- ========== sessions: token do link e resposta do paciente ==========
ALTER TABLE public.sessions
  ADD COLUMN confirm_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN lembrete_paciente_em timestamptz,
  ADD COLUMN paciente_resposta text CHECK (paciente_resposta IN ('confirmada', 'remarcar')),
  ADD COLUMN paciente_respondeu_em timestamptz;

CREATE UNIQUE INDEX sessions_confirm_token_idx ON public.sessions(confirm_token);

-- ========== leitura pública pelo token ==========
-- Devolve só o necessário pra página de confirmação: primeiro nome do
-- paciente (nada de sobrenome, telefone ou dados clínicos), nome do
-- profissional e horário.
CREATE OR REPLACE FUNCTION public.get_session_by_confirm_token(p_token text)
RETURNS TABLE (
  paciente_primeiro_nome text,
  profissional_nome text,
  scheduled_at timestamptz,
  duration_min integer,
  status text,
  paciente_resposta text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    split_part(trim(p.nome), ' ', 1),
    pp.nome,
    s.scheduled_at,
    s.duration_min,
    s.status,
    s.paciente_resposta
  FROM public.sessions s
  JOIN public.patients p ON p.id = s.patient_id
  LEFT JOIN public.professional_profile pp ON pp.user_id = s.user_id
  WHERE p_token IS NOT NULL
    AND length(p_token) = 32
    AND s.confirm_token = p_token;
$$;

-- ========== resposta pública pelo token ==========
-- Só aceita resposta enquanto a sessão está agendada e ainda não passou
-- (com 1h de folga pra quem responde em cima da hora).
CREATE OR REPLACE FUNCTION public.respond_session_by_confirm_token(p_token text, p_resposta text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_resposta IS NULL OR p_resposta NOT IN ('confirmada', 'remarcar') THEN
    RAISE EXCEPTION 'Resposta inválida';
  END IF;
  IF p_token IS NULL OR length(p_token) <> 32 THEN
    RETURN false;
  END IF;

  UPDATE public.sessions
  SET paciente_resposta = p_resposta,
      paciente_respondeu_em = now()
  WHERE confirm_token = p_token
    AND status = 'agendada'
    AND scheduled_at > now() - interval '1 hour';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_session_by_confirm_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_session_by_confirm_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_by_confirm_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_session_by_confirm_token(text, text) TO anon, authenticated;

-- ========== aviso da véspera pro profissional ==========
-- Uma linha por profissional por dia, pra que a execução de hora em hora
-- mande o aviso "você tem N sessões amanhã" uma vez só.
CREATE TABLE public.patient_reminder_digests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia)
);
ALTER TABLE public.patient_reminder_digests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.patient_reminder_digests FROM anon, authenticated;
GRANT ALL ON public.patient_reminder_digests TO service_role;
