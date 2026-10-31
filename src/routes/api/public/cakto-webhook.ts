// Server route: recebe os webhooks da Cakto (compra aprovada, assinatura
// criada/renovada/cancelada) e atualiza a tabela `subscriptions`.
//
// Diferente do Mercado Pago, a Cakto autentica o webhook com um `secret`
// que vem dentro do próprio corpo da requisição (não é assinatura HMAC) —
// documentado em https://docs.cakto.com.br/conceitos/webhooks. Comparamos
// contra o secret salvo e rejeitamos se não bater.
//
// A correlação com o usuário do FisioGO é feita por e-mail: o link de
// checkout da Cakto é pré-preenchido com o e-mail da conta logada, e aqui
// procuramos esse e-mail em auth.users (RPC get_user_id_by_email). Se não
// achar (ex: cliente trocou o e-mail no checkout), o evento é registrado em
// `cakto_webhook_events` com matched_user_id nulo pra resolver manualmente.
//
// Segredos necessários:
//   CAKTO_WEBHOOK_SECRET — o secret gerado ao criar o webhook no painel da Cakto
//   CAKTO_OFFER_ID_MENSAL, CAKTO_OFFER_ID_ANUAL — id da oferta de cada plano
//   RESEND_API_KEY — pro e-mail de confirmação de pagamento (opcional: sem
//     ela a assinatura é ativada normalmente, só o e-mail não sai)
//
// URL a configurar no painel da Cakto: <domínio>/api/public/cakto-webhook

import { createFileRoute } from "@tanstack/react-router";

const PLAN_LABEL: Record<string, string> = { mensal: "Mensal", anual: "Anual" };
const PLAN_PRICE: Record<string, string> = { mensal: "29,90", anual: "299,00" };

// E-mail nosso de confirmação de pagamento — a Cakto já manda o recibo dela,
// esse é só pra reforçar a marca e confirmar que o acesso está liberado.
// Disparado a cada evento de ACTIVATING_EVENTS (compra, assinatura criada,
// renovada ou retomada) — cada um representa uma cobrança concluída.
function buildPaymentConfirmedEmail(nome: string | null, plano: string | undefined, nextPaymentDate?: string) {
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

  return { text, html };
}

async function sendPaymentConfirmedEmail(email: string, nome: string | null, plano: string | undefined, nextPaymentDate?: string) {
  const RESEND_API_KEY = process.env["RESEND_API_KEY"];
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY ausente — pulando e-mail de confirmação de pagamento.");
    return;
  }
  const { text, html } = buildPaymentConfirmedEmail(nome, plano, nextPaymentDate);
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

const ACTIVATING_EVENTS = new Set([
  "purchase_approved",
  "subscription_created",
  "subscription_renewed",
  "subscription_resumed",
]);
const CANCEL_EVENTS = new Set(["subscription_canceled"]);
const LATE_EVENTS = new Set(["subscription_renewal_refused", "subscription_paused"]);

type CaktoWebhookBody = {
  secret?: string;
  event?: string;
  data?: {
    id?: string;
    customer?: { email?: string };
    offer?: { id?: string };
    product?: { id?: string };
    subscription?: { id?: string; next_payment_date?: string } | null;
  };
};

export const Route = createFileRoute("/api/public/cakto-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const CAKTO_WEBHOOK_SECRET = process.env["CAKTO_WEBHOOK_SECRET"];
        const CAKTO_OFFER_ID_MENSAL = process.env["CAKTO_OFFER_ID_MENSAL"];
        const CAKTO_OFFER_ID_ANUAL = process.env["CAKTO_OFFER_ID_ANUAL"];

        let payload: CaktoWebhookBody;
        try {
          payload = (await request.json()) as CaktoWebhookBody;
        } catch {
          return new Response("ok", { status: 200 });
        }

        if (!CAKTO_WEBHOOK_SECRET || !payload.secret || payload.secret !== CAKTO_WEBHOOK_SECRET) {
          return new Response("unauthorized", { status: 401 });
        }

        const event = payload.event ?? "";
        const data = payload.data ?? {};

        if (!ACTIVATING_EVENTS.has(event) && !CANCEL_EVENTS.has(event) && !LATE_EVENTS.has(event)) {
          return new Response("ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const email = data.customer?.email?.trim().toLowerCase();
        let userId: string | null = null;
        if (email) {
          const { data: foundId, error: lookupErr } = await supabaseAdmin.rpc("get_user_id_by_email", {
            p_email: email,
          });
          if (lookupErr) console.error("Erro ao buscar usuário por e-mail:", lookupErr.message);
          userId = (foundId as string | null) ?? null;
        }

        await supabaseAdmin.from("cakto_webhook_events").insert({
          event,
          cakto_order_id: data.id ?? data.subscription?.id ?? null,
          email: email ?? null,
          matched_user_id: userId,
          payload,
        });

        if (!userId) {
          return new Response("ok - unmatched", { status: 200 });
        }

        const offerId = data.offer?.id ?? data.product?.id;
        const plano =
          offerId && offerId === CAKTO_OFFER_ID_ANUAL
            ? "anual"
            : offerId && offerId === CAKTO_OFFER_ID_MENSAL
              ? "mensal"
              : undefined;

        const updates: {
          provider: string;
          status?: string;
          plano?: string;
          cakto_subscription_id?: string;
          current_period_end?: string;
        } = { provider: "cakto" };
        if (ACTIVATING_EVENTS.has(event)) updates.status = "ativo";
        else if (CANCEL_EVENTS.has(event)) updates.status = "cancelado";
        else if (LATE_EVENTS.has(event)) updates.status = "atrasado";
        if (plano) updates.plano = plano;
        if (data.subscription?.id) updates.cakto_subscription_id = data.subscription.id;
        if (data.subscription?.next_payment_date) {
          updates.current_period_end = data.subscription.next_payment_date;
        }

        const { error } = await supabaseAdmin.from("subscriptions").update(updates).eq("user_id", userId);
        if (error) {
          console.error("Erro ao atualizar subscriptions (cakto):", error.message);
          return new Response("error", { status: 500 });
        }

        if (ACTIVATING_EVENTS.has(event) && email) {
          const { data: profile } = await supabaseAdmin
            .from("professional_profile")
            .select("nome")
            .eq("user_id", userId)
            .maybeSingle();
          await sendPaymentConfirmedEmail(
            email,
            profile?.nome ?? null,
            plano,
            data.subscription?.next_payment_date,
          );
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
