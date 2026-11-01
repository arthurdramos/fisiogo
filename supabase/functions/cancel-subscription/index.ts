// Edge Function: cancela a assinatura paga do usuário autenticado, direto
// no provedor de pagamento (Cakto ou Mercado Pago) conforme o campo
// `provider` salvo em `subscriptions`, e marca status = 'cancelado' na hora
// (sem esperar o webhook do provedor, que ainda chega depois e só confirma
// o mesmo estado). Chamada pelo botão "Cancelar assinatura" em
// src/routes/_authenticated/perfil.tsx.
//
// Segredos necessários:
//   CAKTO_CLIENT_ID, CAKTO_CLIENT_SECRET — credenciais de API da Cakto,
//     geradas em Integrações → Cakto API → Criar Chave de API, com o
//     escopo "write subscriptions". Diferente do CAKTO_WEBHOOK_SECRET
//     (que só autentica o webhook recebido), essas são pra Edge Function
//     chamar a API da Cakto de volta.
//   MERCADOPAGO_ACCESS_TOKEN — mesmo das outras funções

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAKTO_CLIENT_ID = Deno.env.get("CAKTO_CLIENT_ID");
const CAKTO_CLIENT_SECRET = Deno.env.get("CAKTO_CLIENT_SECRET");
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

type Result = { ok: true } | { ok: false; error: string };

async function cancelCakto(subscriptionId: string): Promise<Result> {
  if (!CAKTO_CLIENT_ID || !CAKTO_CLIENT_SECRET) {
    return { ok: false, error: "Cancelamento automático da Cakto não configurado." };
  }

  // Troca client_id/secret por um access_token novo a cada chamada — o
  // volume é baixo (ação manual do usuário), não vale a pena cachear/
  // renovar token entre invocações.
  const tokenRes = await fetch("https://api.cakto.com.br/public_api/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CAKTO_CLIENT_ID, client_secret: CAKTO_CLIENT_SECRET }),
  });
  if (!tokenRes.ok) {
    console.error("Erro ao autenticar na API da Cakto:", await tokenRes.text());
    return { ok: false, error: "Não foi possível autenticar com a Cakto." };
  }
  const { access_token } = await tokenRes.json();

  const cancelRes = await fetch(`https://api.cakto.com.br/public_api/subscriptions/${subscriptionId}/cancel/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!cancelRes.ok) {
    const body = await cancelRes.text();
    console.error("Erro ao cancelar assinatura na Cakto:", body);
    // "já cancelada" não é bem um erro do ponto de vista do usuário final —
    // o resultado que ele queria (não ser mais cobrado) já está garantido.
    if (cancelRes.status === 400 && body.toLowerCase().includes("already")) {
      return { ok: true };
    }
    return { ok: false, error: "Não foi possível cancelar pela Cakto. Tente novamente ou use o Fale Conosco." };
  }
  return { ok: true };
}

async function cancelMercadoPago(preapprovalId: string): Promise<Result> {
  if (!MP_ACCESS_TOKEN) {
    return { ok: false, error: "Cancelamento automático do Mercado Pago não configurado." };
  }
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) {
    console.error("Erro ao cancelar assinatura no Mercado Pago:", await res.text());
    return { ok: false, error: "Não foi possível cancelar pelo Mercado Pago. Tente novamente ou use o Fale Conosco." };
  }
  return { ok: true };
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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("status, provider, cakto_subscription_id, mp_preapproval_id")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: "Assinatura não encontrada." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (sub.status !== "ativo") {
    return new Response(JSON.stringify({ error: "Você não tem uma assinatura paga ativa para cancelar." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let result: Result;
  if (sub.provider === "cakto" && sub.cakto_subscription_id) {
    result = await cancelCakto(sub.cakto_subscription_id);
  } else if (sub.provider === "mercadopago" && sub.mp_preapproval_id) {
    result = await cancelMercadoPago(sub.mp_preapproval_id);
  } else {
    result = {
      ok: false,
      error: "Não encontramos os dados da sua assinatura no provedor de pagamento. Entre em contato pelo Fale Conosco.",
    };
  }

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({ status: "cancelado" })
    .eq("user_id", userRes.user.id);
  if (updateErr) {
    console.error("Erro ao atualizar status após cancelamento:", updateErr.message);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
