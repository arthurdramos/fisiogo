// Edge Function: recebe as notificações (webhooks) do Mercado Pago sobre
// assinaturas (preapproval) e atualiza a tabela `subscriptions`.
//
// Configure esta URL publicada no painel do Mercado Pago em:
//   Suas integrações → [sua aplicação] → Webhooks → URL de notificação
//
// Nunca confiamos no conteúdo do payload recebido — ele só avisa "algo
// mudou"; sempre confirmamos o estado real consultando a API do Mercado
// Pago de volta, usando o Access Token guardado como secret.
//
// Segredos necessários: MERCADOPAGO_ACCESS_TOKEN (mesmo da outra função).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

// Mapeamento do status do Mercado Pago para o status interno do app.
// "pending" (assinatura criada mas ainda não autorizada) não move o status.
const STATUS_MAP: Record<string, string> = {
  authorized: "ativo",
  paused: "atrasado",
  cancelled: "cancelado",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: { type?: string; data?: { id?: string } };
  try {
    payload = await req.json();
  } catch {
    // Corpo vazio/; devolve 200 pra não deixar o Mercado Pago reenviando à toa.
    return new Response("ok", { status: 200 });
  }

  if (payload.type !== "subscription_preapproval" || !payload.data?.id) {
    return new Response("ignored", { status: 200 });
  }

  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${payload.data.id}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });

  if (!mpRes.ok) {
    console.error("Erro ao consultar preapproval no Mercado Pago:", await mpRes.text());
    return new Response("error", { status: 502 });
  }

  const preapproval = await mpRes.json();
  const status = STATUS_MAP[preapproval.status as string];
  const userId = preapproval.external_reference as string | undefined;

  if (!status || !userId) {
    return new Response("ok", { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await admin
    .from("subscriptions")
    .update({
      status,
      provider: "mercadopago",
      mp_preapproval_id: preapproval.id,
      current_period_end: preapproval.auto_recurring?.next_payment_date ?? null,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao atualizar subscriptions:", error.message);
    return new Response("error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
