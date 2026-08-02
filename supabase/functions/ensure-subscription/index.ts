// Edge Function: garante que o usuário autenticado tenha uma linha em
// `subscriptions` (trial de 7 dias), chamando public.ensure_subscription.
//
// Essa função do banco é SECURITY DEFINER e restrita a service_role — não
// pode ser criado um trigger direto em auth.users em bancos gerenciados
// (Lovable Cloud/Supabase hosted), então essa Edge Function é o intermediário
// chamado pelo frontend logo na primeira vez que o usuário aparece sem
// assinatura (ver _authenticated/route.tsx).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await adminClient.rpc("ensure_subscription", { _user_id: userRes.user.id });

  if (error) {
    console.error("Erro ao garantir subscription:", error.message);
    return new Response(JSON.stringify({ error: "Erro ao preparar assinatura" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
