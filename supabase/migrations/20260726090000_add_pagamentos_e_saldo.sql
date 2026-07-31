-- ========== sessions: status de pagamento + valor carimbado ==========
ALTER TABLE public.sessions
  ADD COLUMN pago boolean NOT NULL DEFAULT false,
  ADD COLUMN pago_via text CHECK (pago_via IN ('avulso','credito')),
  ADD COLUMN pago_em timestamptz,
  ADD COLUMN valor_cobrado numeric(10,2),
  ADD COLUMN custo_registrado numeric(10,2);

-- Carimba valor/custo nas sessões já realizadas, usando o valor atual do paciente
UPDATE public.sessions s
SET valor_cobrado = p.valor_sessao,
    custo_registrado = p.custo_sessao
FROM public.patients p
WHERE s.patient_id = p.id
  AND s.status = 'realizada'
  AND s.valor_cobrado IS NULL;

-- ========== patient_payments (saldo / carteira) ==========
CREATE TABLE public.patient_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_payments TO authenticated;
GRANT ALL ON public.patient_payments TO service_role;
ALTER TABLE public.patient_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own patient payments" ON public.patient_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX patient_payments_patient_idx ON public.patient_payments(patient_id);
