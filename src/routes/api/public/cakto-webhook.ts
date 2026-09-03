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
//
// URL a configurar no painel da Cakto: <domínio>/api/public/cakto-webhook

import { createFileRoute } from "@tanstack/react-router";

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
          payload: payload as never,
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

        const updates: Record<string, unknown> = { provider: "cakto" };
        if (ACTIVATING_EVENTS.has(event)) updates.status = "ativo";
        else if (CANCEL_EVENTS.has(event)) updates.status = "cancelado";
        else if (LATE_EVENTS.has(event)) updates.status = "atrasado";
        if (plano) updates.plano = plano;
        if (data.subscription?.id) updates.cakto_subscription_id = data.subscription.id;
        if (data.subscription?.next_payment_date) {
          updates.current_period_end = data.subscription.next_payment_date;
        }

        const { error } = await supabaseAdmin.from("subscriptions").update(updates as never).eq("user_id", userId);
        if (error) {
          console.error("Erro ao atualizar subscriptions (cakto):", error.message);
          return new Response("error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
