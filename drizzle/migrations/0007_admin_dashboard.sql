CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(json_agg(r ORDER BY r.created_at DESC), '[]'::json) INTO result FROM (
    SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
      coalesce(u.raw_app_meta_data->>'provider', 'email') AS provider,
      coalesce(pp.nome, u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name') AS nome,
      sa.utm_source, sa.utm_medium, sa.utm_campaign, sa.referrer,
      s.status AS sub_status, s.trial_ends_at, s.plano,
      (SELECT count(*) FROM public.patients p WHERE p.user_id = u.id) AS pacientes,
      (SELECT count(*) FROM public.sessions x WHERE x.user_id = u.id) AS sessoes,
      (SELECT count(*) FROM public.treatment_plans t WHERE t.user_id = u.id) AS planos,
      EXISTS (SELECT 1 FROM public.booking_settings b WHERE b.user_id = u.id) AS agendamento,
      greatest(
        (SELECT max(updated_at) FROM public.sessions x WHERE x.user_id = u.id),
        (SELECT max(updated_at) FROM public.patients p WHERE p.user_id = u.id)
      ) AS ultima_atividade
    FROM auth.users u
    LEFT JOIN public.professional_profile pp ON pp.user_id = u.id
    LEFT JOIN public.signup_attribution sa ON sa.user_id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE u.email NOT LIKE '%@example.com'
    ORDER BY u.created_at DESC
    LIMIT 300
  ) r;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard() TO authenticated;