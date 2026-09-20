// Edge Function: garante que o usuário autenticado tenha uma linha em
// `subscriptions` (trial de 7 dias), chamando public.ensure_subscription.
//
// Essa função do banco é SECURITY DEFINER e restrita a service_role — não
// pode ser criado um trigger direto em auth.users em bancos gerenciados
// (Lovable Cloud/Supabase hosted), então essa Edge Function é o intermediário
// chamado pelo frontend logo na primeira vez que o usuário aparece sem
// assinatura (ver _authenticated/route.tsx).
//
// public.ensure_subscription retorna true só quando a linha é criada nessa
// chamada (ON CONFLICT DO NOTHING) — usamos isso pra disparar o e-mail de
// boas-vindas exatamente uma vez por usuário, mesmo que a função seja
// invocada de novo (ex: duas abas abertas simultaneamente no 1º acesso).
//
// Segredo necessário pro e-mail: RESEND_API_KEY (mesma usada em
// src/routes/_authenticated/fale-conosco.tsx, mas configurada separadamente
// aqui pois Edge Functions leem secrets do Supabase/Lovable Cloud, não do
// ambiente Node). Se não estiver configurada, a assinatura ainda é criada
// normalmente — só o e-mail não sai.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { WELCOME_EMAIL_SUBJECT, buildWelcomeEmail } from "../_shared/welcome-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendWelcomeEmail(email: string, nome: string | null) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY ausente — pulando e-mail de boas-vindas.");
    return;
  }
  const { text, html } = buildWelcomeEmail(nome);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FisioGO <naoresponda@fisiogo.online>",
        to: [email],
        subject: WELCOME_EMAIL_SUBJECT,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Erro ao enviar e-mail de boas-vindas via Resend:", await res.text());
    }
  } catch (err) {
    // Nunca deixa uma falha no envio do e-mail quebrar a criação da assinatura.
    console.error("Erro ao enviar e-mail de boas-vindas:", err);
  }
}

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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: created, error } = await adminClient.rpc("ensure_subscription", {
    _user_id: userRes.user.id,
  });

  if (error) {
    console.error("Erro ao garantir subscription:", error.message);
    return new Response(JSON.stringify({ error: "Erro ao preparar assinatura" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (created === true && userRes.user.email) {
    const meta = userRes.user.user_metadata ?? {};
    const nome =
      (typeof meta.nome === "string" && meta.nome.trim()) ||
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      null;
    await sendWelcomeEmail(userRes.user.email, nome || null);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
