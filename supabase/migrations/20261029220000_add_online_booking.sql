-- Agendamento online: página pública /agendar/<slug> onde qualquer pessoa
-- vê os horários livres do profissional e pede um horário. Todo pedido fica
-- "pendente" até o profissional aceitar (cria a sessão, e o paciente se o
-- telefone ainda não estiver cadastrado) ou recusar, pela Agenda.
--
-- O visitante nunca acessa as tabelas: lê e grava só pelas funções
-- SECURITY DEFINER abaixo, que expõem o nome do profissional, os horários
-- de atendimento e os intervalos ocupados (sem nomes).

-- ========== telefone comparável ==========
-- DDD + últimos 8 dígitos, ignorando +55, zero de interurbano, máscara e o
-- 9 do celular — pra achar o paciente já cadastrado com o telefone digitado
-- de outro jeito.
CREATE OR REPLACE FUNCTION public.phone_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  WITH d AS (SELECT ltrim(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '0') AS v),
       n AS (SELECT CASE WHEN length(v) IN (12, 13) AND left(v, 2) = '55' THEN substr(v, 3) ELSE v END AS v FROM d)
  SELECT CASE
    WHEN length(v) = 11 THEN left(v, 2) || right(v, 8)
    WHEN length(v) = 10 THEN v
    ELSE NULL
  END FROM n;
$$;

-- ========== configuração ==========
CREATE TABLE public.booking_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE
    CHECK (length(slug) BETWEEN 3 AND 40 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ativo boolean NOT NULL DEFAULT true,
  duracao_min integer NOT NULL DEFAULT 50 CHECK (duracao_min BETWEEN 15 AND 240),
  antecedencia_horas integer NOT NULL DEFAULT 12 CHECK (antecedencia_horas BETWEEN 0 AND 168),
  janela_dias integer NOT NULL DEFAULT 21 CHECK (janela_dias BETWEEN 1 AND 90),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_settings TO authenticated;
GRANT ALL ON public.booking_settings TO service_role;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own booking settings" ON public.booking_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_booking_settings_updated BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Faixas de atendimento por dia da semana (0 = domingo), no horário de Brasília.
CREATE TABLE public.booking_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  inicio time NOT NULL,
  fim time NOT NULL,
  CHECK (fim > inicio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_hours TO authenticated;
GRANT ALL ON public.booking_hours TO service_role;
ALTER TABLE public.booking_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own booking hours" ON public.booking_hours FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX booking_hours_user_idx ON public.booking_hours(user_id);

-- ========== pedidos ==========
CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  nome text NOT NULL CHECK (length(nome) BETWEEN 2 AND 100),
  telefone text NOT NULL CHECK (telefone ~ '^55[0-9]{10,11}$'),
  scheduled_at timestamptz NOT NULL,
  duration_min integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  notificado_em timestamptz,
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own booking requests" ON public.booking_requests FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX booking_requests_user_status_idx ON public.booking_requests(user_id, status, scheduled_at);

-- ========== página pública ==========
-- null se o endereço não existe ou a página está desligada.
CREATE OR REPLACE FUNCTION public.get_booking_page(p_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'profissional_nome', pp.nome,
    'duracao_min', b.duracao_min,
    'antecedencia_horas', b.antecedencia_horas,
    'janela_dias', b.janela_dias,
    'horarios', coalesce((
      SELECT json_agg(json_build_object(
        'weekday', h.weekday,
        'inicio', to_char(h.inicio, 'HH24:MI'),
        'fim', to_char(h.fim, 'HH24:MI')
      ) ORDER BY h.weekday, h.inicio)
      FROM public.booking_hours h WHERE h.user_id = b.user_id
    ), '[]'::json),
    'ocupados', coalesce((
      SELECT json_agg(json_build_object('inicio', x.inicio, 'fim', x.fim))
      FROM (
        SELECT s.scheduled_at AS inicio, s.scheduled_at + make_interval(mins => s.duration_min) AS fim
        FROM public.sessions s
        WHERE s.user_id = b.user_id
          AND s.status <> 'cancelada'
          AND s.scheduled_at + make_interval(mins => s.duration_min) > now()
          AND s.scheduled_at < now() + make_interval(days => b.janela_dias + 1)
        UNION ALL
        SELECT r.scheduled_at, r.scheduled_at + make_interval(mins => r.duration_min)
        FROM public.booking_requests r
        WHERE r.user_id = b.user_id AND r.status = 'pendente' AND r.scheduled_at > now()
      ) x
    ), '[]'::json)
  )
  FROM public.booking_settings b
  LEFT JOIN public.professional_profile pp ON pp.user_id = b.user_id
  WHERE b.slug = lower(trim(p_slug)) AND b.ativo;
$$;

-- Cria o pedido depois de refazer todas as checagens da página: horário de
-- atendimento, antecedência, janela e conflito. Devolve o token público do
-- pedido (usado pra avisar o profissional).
CREATE OR REPLACE FUNCTION public.request_booking(p_slug text, p_nome text, p_telefone text, p_inicio timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.booking_settings;
  v_nome text := trim(coalesce(p_nome, ''));
  v_local timestamp;
  v_local_fim timestamp;
  v_fim timestamptz;
  v_token text;
BEGIN
  SELECT * INTO b FROM public.booking_settings WHERE slug = lower(trim(p_slug)) AND ativo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta agenda não está disponível.'; END IF;
  IF length(v_nome) < 2 OR length(v_nome) > 100 THEN RAISE EXCEPTION 'Informe seu nome.'; END IF;
  IF p_telefone IS NULL OR p_telefone !~ '^55[0-9]{10,11}$' THEN RAISE EXCEPTION 'Informe um WhatsApp válido, com DDD.'; END IF;
  IF p_inicio IS NULL
     OR p_inicio < now() + make_interval(hours => b.antecedencia_horas)
     OR p_inicio > now() + make_interval(days => b.janela_dias + 1) THEN
    RAISE EXCEPTION 'Esse horário não está mais disponível. Escolha outro.';
  END IF;

  v_fim := p_inicio + make_interval(mins => b.duracao_min);
  v_local := p_inicio AT TIME ZONE 'America/Sao_Paulo';
  v_local_fim := v_fim AT TIME ZONE 'America/Sao_Paulo';
  IF v_local_fim::date <> v_local::date OR NOT EXISTS (
    SELECT 1 FROM public.booking_hours h
    WHERE h.user_id = b.user_id
      AND h.weekday = extract(dow FROM v_local)
      AND h.inicio <= v_local::time
      AND v_local_fim::time <= h.fim
  ) THEN
    RAISE EXCEPTION 'Esse horário está fora do atendimento. Escolha outro.';
  END IF;

  -- Um pedido por vez por profissional: sem isso, dois visitantes podiam
  -- pegar o mesmo horário ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtext(b.user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.user_id = b.user_id AND s.status <> 'cancelada'
      AND s.scheduled_at < v_fim AND s.scheduled_at + make_interval(mins => s.duration_min) > p_inicio
  ) OR EXISTS (
    SELECT 1 FROM public.booking_requests r
    WHERE r.user_id = b.user_id AND r.status = 'pendente'
      AND r.scheduled_at < v_fim AND r.scheduled_at + make_interval(mins => r.duration_min) > p_inicio
  ) THEN
    RAISE EXCEPTION 'Esse horário acabou de ser ocupado. Escolha outro.';
  END IF;

  IF (SELECT count(*) FROM public.booking_requests r
      WHERE r.user_id = b.user_id AND r.status = 'pendente' AND r.scheduled_at > now()
        AND public.phone_key(r.telefone) = public.phone_key(p_telefone)) >= 2 THEN
    RAISE EXCEPTION 'Você já tem pedidos aguardando resposta. Aguarde o retorno pelo WhatsApp.';
  END IF;
  IF (SELECT count(*) FROM public.booking_requests r
      WHERE r.user_id = b.user_id AND r.status = 'pendente' AND r.scheduled_at > now()) >= 30 THEN
    RAISE EXCEPTION 'Esta agenda não está aceitando novos pedidos agora.';
  END IF;

  INSERT INTO public.booking_requests (user_id, nome, telefone, scheduled_at, duration_min)
  VALUES (b.user_id, v_nome, p_telefone, p_inicio, b.duracao_min)
  RETURNING public_token INTO v_token;
  RETURN v_token;
END;
$$;

-- ========== resposta do profissional ==========
-- Aceita o pedido: usa o paciente com o mesmo telefone ou cria um novo, e
-- cria a sessão agendada. Devolve o que a Agenda precisa pra avisar o
-- paciente pelo WhatsApp com o link de confirmação.
CREATE OR REPLACE FUNCTION public.accept_booking_request(p_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.booking_requests;
  v_patient uuid;
  v_session uuid;
  v_confirm text;
BEGIN
  SELECT * INTO r FROM public.booking_requests WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF r.status <> 'pendente' THEN RAISE EXCEPTION 'Este pedido já foi respondido.'; END IF;

  SELECT p.id INTO v_patient FROM public.patients p
  WHERE p.user_id = r.user_id AND public.phone_key(p.telefone) = public.phone_key(r.telefone)
  ORDER BY p.created_at LIMIT 1;
  IF v_patient IS NULL THEN
    INSERT INTO public.patients (user_id, nome, telefone) VALUES (r.user_id, r.nome, r.telefone)
    RETURNING id INTO v_patient;
  END IF;

  INSERT INTO public.sessions (user_id, patient_id, scheduled_at, duration_min)
  VALUES (r.user_id, v_patient, r.scheduled_at, r.duration_min)
  RETURNING id, confirm_token INTO v_session, v_confirm;

  UPDATE public.booking_requests
  SET status = 'aceito', session_id = v_session, respondido_em = now()
  WHERE id = r.id;

  RETURN json_build_object('session_id', v_session, 'patient_id', v_patient, 'confirm_token', v_confirm);
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_page(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_booking(text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_booking_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_booking(text, text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_booking_request(uuid) TO authenticated;
