// Edge Function: confirma manualmente o e-mail de um usuário (equivalente
// a clicar no link de confirmação), pra casos como alguém que não recebeu
// ou não encontrou o e-mail de confirmação do Supabase e ficou travado sem
// conseguir entrar. Ferramenta interna — NUNCA chamada pelo frontend, só
// manualmente (curl/Postman) por quem administra o projeto.
//
// Protegida por um secret próprio (não é a senha de ninguém, é só um token
// que só nós sabemos) — sem isso, qualquer pessoa poderia confirmar o
// e-mail de qualquer conta alheia, o que seria uma falha de segurança séria.
//
// Segredo necessário: ADMIN_TOOL_SECRET (qualquer string aleatória longa,
// gerada por vocês — não existe isso em lugar nenhum da Meta/Cakto/etc,
// é só nossa).
//
// Uso: POST com header "Authorization: Bearer <ADMIN_TOOL_SECRET>" e corpo
// { "email": "pessoa@exemplo.com" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOOL_SECRET = Deno.env.get("ADMIN_TOOL_SECRET");

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

  if (!ADMIN_TOOL_SECRET) {
    return new Response(JSON.stringify({ error: "ADMIN_TOOL_SECRET não configurado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${ADMIN_TOOL_SECRET}`) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ error: "email é obrigatório" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userId, error: lookupErr } = await admin.rpc("get_user_id_by_email", { p_email: email });
  if (lookupErr || !userId) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado para esse e-mail." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId as string, { email_confirm: true });
  if (updateErr) {
    console.error("Erro ao confirmar e-mail manualmente:", updateErr.message);
    return new Response(JSON.stringify({ error: "Erro ao confirmar e-mail." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, email, user_id: userId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
