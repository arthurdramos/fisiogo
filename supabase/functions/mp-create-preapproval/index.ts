// Edge Function: cria uma assinatura (preapproval) no Mercado Pago para o
// usuário autenticado e devolve o link de checkout (init_point).
//
// Segredos necessários (configurar em Supabase/Lovable → Secrets):
//   MERCADOPAGO_ACCESS_TOKEN — Access Token do Mercado Pago (teste ou produção)
//
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já ficam
// disponíveis automaticamente em toda Edge Function do Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

const PLANS: Record<string, { amount: number; frequency: number; reason: string }> = {
  mensal: { amount: 29.9, frequency: 1, reason: "FisioFlow - Plano mensal" },
  anual: { amount: 299.0, frequency: 12, reason: "FisioFlow - Plano anual" },
};

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

  let body: { plano?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const plan = body.plano ? PLANS[body.plano] : undefined;
  if (!plan) {
    return new Response(JSON.stringify({ error: "Plano inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const origin = req.headers.get("origin") ?? "";

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      reason: plan.reason,
      external_reference: userRes.user.id,
      payer_email: userRes.user.email,
      back_url: `${origin}/assinatura`,
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: "months",
        transaction_amount: plan.amount,
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });

  if (!mpRes.ok) {
    const errBody = await mpRes.text();
    console.error("Mercado Pago create preapproval error:", errBody);
    return new Response(JSON.stringify({ error: "Erro ao criar assinatura no Mercado Pago" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mpData = await mpRes.json();

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await adminClient
    .from("subscriptions")
    .update({ mp_preapproval_id: mpData.id, plano: body.plano })
    .eq("user_id", userRes.user.id);

  return new Response(JSON.stringify({ init_point: mpData.init_point }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
