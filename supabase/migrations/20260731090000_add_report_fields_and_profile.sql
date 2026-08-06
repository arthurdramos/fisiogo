-- ========== patients: campos clínicos + modelos padrão do fechamento ==========
ALTER TABLE public.patients
  ADD COLUMN ap_historico text,
  ADD COLUMN queixa_principal text,
  ADD COLUMN template_estado_geral text,
  ADD COLUMN template_sinais_vitais text,
  ADD COLUMN template_atendimentos_realizados text,
  ADD COLUMN template_observacoes_evolucoes text;

-- ========== professional_profile (dados do profissional para o relatório) ==========
CREATE TABLE public.professional_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  crefito text,
  telefone text,
  banco text,
  agencia text,
  conta text,
  chave_pix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profile TO authenticated;
GRANT ALL ON public.professional_profile TO service_role;
ALTER TABLE public.professional_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own professional profile" ON public.professional_profile FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_professional_profile_updated BEFORE UPDATE ON public.professional_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
