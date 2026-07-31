-- ========== billing_reports (histórico de relatórios de cobrança) ==========
CREATE TABLE public.billing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_ids uuid[] NOT NULL,
  total numeric(10,2) NOT NULL,
  pdf_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_reports TO authenticated;
GRANT ALL ON public.billing_reports TO service_role;
ALTER TABLE public.billing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own billing reports" ON public.billing_reports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX billing_reports_patient_idx ON public.billing_reports(patient_id);

-- ========== storage bucket para os PDFs gerados ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('billing-reports', 'billing-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own billing report files select" ON storage.objects FOR SELECT
  USING (bucket_id = 'billing-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own billing report files insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'billing-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own billing report files delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'billing-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
