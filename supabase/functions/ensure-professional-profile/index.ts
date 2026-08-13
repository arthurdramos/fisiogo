// Edge Function: garante que o usuário autenticado tenha uma linha em
// `professional_profile`, preenchida com crefito/telefone/aceite LGPD
// informados no cadastro (gravados em auth.users.user_metadata pelo signUp,
// já que na hora do signUp pode não haver sessão ainda se a confirmação de
// email estiver ativa). Chama public.ensure_professional_profile, que é
// SECURITY DEFINER restrita a service_role — o cliente não pode chamá-la
// diretamente. Ver _authenticated/route.tsx.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const meta = userRes.user.user_metadata ?? {};
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await adminClient.rpc("ensure_professional_profile", {
    _user_id: userRes.user.id,
    _crefito: typeof meta.crefito === "string" ? meta.crefito : null,
    _telefone: typeof meta.telefone === "string" ? meta.telefone : null,
    _lgpd_aceite: meta.lgpd_aceite === true,
  });

  if (error) {
    console.error("Erro ao garantir professional_profile:", error.message);
    return new Response(JSON.stringify({ error: "Erro ao preparar perfil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
