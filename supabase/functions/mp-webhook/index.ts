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
//   RESEND_API_KEY — pro e-mail de confirmação de pagamento (opcional: sem
//     ela a assinatura é ativada normalmente, só o e-mail não sai)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Mapeamento do status do Mercado Pago para o status interno do app.
// "pending" (assinatura criada mas ainda não autorizada) não move o status.
const STATUS_MAP: Record<string, string> = {
  authorized: "ativo",
  paused: "atrasado",
  cancelled: "cancelado",
};

const PLAN_LABEL: Record<string, string> = { mensal: "Mensal", anual: "Anual" };
const PLAN_PRICE: Record<string, string> = { mensal: "29,90", anual: "299,00" };

// E-mail nosso de confirmação de pagamento — o Mercado Pago já manda recibo
// dele, esse é só pra reforçar a marca. Mesmo conteúdo do que mandamos pra
// quem assina pela Cakto (ver src/routes/api/public/cakto-webhook.ts).
async function sendPaymentConfirmedEmail(
  email: string,
  nome: string | null,
  plano: string | null | undefined,
  nextPaymentDate?: string | null,
) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY ausente — pulando e-mail de confirmação de pagamento.");
    return;
  }

  const saudacao = nome ? `Olá, ${nome}!` : "Olá!";
  const planoLabel = (plano && PLAN_LABEL[plano]) || "FisioGO";
  const valor = plano ? PLAN_PRICE[plano] : undefined;

  let proximaCobranca = "";
  if (nextPaymentDate) {
    const d = new Date(nextPaymentDate);
    if (!Number.isNaN(d.getTime())) {
      const dataFormatada = d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
      proximaCobranca = valor
        ? `Próxima cobrança: ${dataFormatada} · R$ ${valor}\n\n`
        : `Próxima cobrança: ${dataFormatada}\n\n`;
    }
  }

  const text = `${saudacao}

Recebemos a confirmação do seu pagamento — sua assinatura do plano ${planoLabel} do FisioGO está ativa.

${proximaCobranca}A partir de agora você tem acesso completo: agenda, financeiro, prontuário, cobranças e relatórios do seu consultório, sem limite.

Um abraço,
Equipe FisioGO`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:16px">${saudacao}</p>
  <p>Recebemos a confirmação do seu pagamento — sua assinatura do plano <strong>${planoLabel}</strong> do FisioGO está ativa.</p>
  ${proximaCobranca ? `<p>${proximaCobranca.replace("\n\n", "")}</p>` : ""}
  <p>A partir de agora você tem acesso completo: agenda, financeiro, prontuário, cobranças e relatórios do seu consultório, sem limite.</p>
  <p>Um abraço,<br>Equipe FisioGO</p>
</div>`;

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
        subject: "Pagamento confirmado — sua assinatura FisioGO está ativa ✅",
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Erro ao enviar e-mail de confirmação de pagamento via Resend:", await res.text());
    }
  } catch (err) {
    // Nunca deixa uma falha no envio do e-mail quebrar o processamento do webhook.
    console.error("Erro ao enviar e-mail de confirmação de pagamento:", err);
  }
}

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
  const { data: updatedSub, error } = await admin
    .from("subscriptions")
    .update({
      status,
      provider: "mercadopago",
      mp_preapproval_id: preapproval.id,
      current_period_end: preapproval.auto_recurring?.next_payment_date ?? null,
    })
    .eq("user_id", userId)
    .select("plano")
    .maybeSingle();

  if (error) {
    console.error("Erro ao atualizar subscriptions:", error.message);
    return new Response("error", { status: 500 });
  }

  if (status === "ativo") {
    const email = preapproval.payer_email as string | undefined;
    if (email) {
      const { data: profile } = await admin
        .from("professional_profile")
        .select("nome")
        .eq("user_id", userId)
        .maybeSingle();
      await sendPaymentConfirmedEmail(
        email,
        profile?.nome ?? null,
        updatedSub?.plano,
        preapproval.auto_recurring?.next_payment_date,
      );
    }
  }

  return new Response("ok", { status: 200 });
});
