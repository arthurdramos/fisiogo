-- Link de calendário do profissional: um endereço secreto que ele assina no
-- Google Agenda, Outlook ou iPhone pra ver as sessões do FisioGO junto com o
-- resto da agenda. A rota /api/public/calendar/<token> lê as sessões pela
-- função get_calendar_feed; o profissional só enxerga e altera a sua linha.

CREATE TABLE public.calendar_feeds (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  -- Mostra só as iniciais do paciente no título do evento (menos dado
  -- pessoal guardado no Google/Microsoft).
  so_iniciais boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_feeds TO authenticated;
GRANT ALL ON public.calendar_feeds TO service_role;
ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own calendar feed" ON public.calendar_feeds FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== leitura pública pelo token ==========
-- A rota do calendário chama esta função com a chave pública (sem service
-- role). Token desconhecido simplesmente não devolve linhas.
CREATE OR REPLACE FUNCTION public.get_calendar_feed(p_token text)
RETURNS TABLE (
  session_id uuid,
  scheduled_at timestamptz,
  duration_min integer,
  status text,
  paciente_resposta text,
  updated_at timestamptz,
  paciente_nome text,
  so_iniciais boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.scheduled_at, s.duration_min, s.status, s.paciente_resposta, s.updated_at, p.nome, f.so_iniciais
  FROM public.calendar_feeds f
  JOIN public.sessions s ON s.user_id = f.user_id
  JOIN public.patients p ON p.id = s.patient_id
  WHERE p_token IS NOT NULL
    AND length(p_token) = 32
    AND f.token = p_token
    AND s.status <> 'cancelada'
    AND s.scheduled_at >= now() - interval '60 days'
    AND s.scheduled_at < now() + interval '365 days'
  ORDER BY s.scheduled_at;
$$;

REVOKE ALL ON FUNCTION public.get_calendar_feed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_calendar_feed(text) TO anon, authenticated;
