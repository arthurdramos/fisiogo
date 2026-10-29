// Envio de notificações push pros aparelhos do profissional, compartilhado
// entre as funções de lembrete e de pedido de agendamento.
//
// Segredos necessários: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  "mailto:contato@fisiogo.online",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

// Sem os tipos gerados do banco aqui, então o schema fica como `any` — igual
// ao cliente que `createClient(url, key)` devolve.
// deno-lint-ignore no-explicit-any
export type Admin = SupabaseClient<any, "public", any>;

// Envia o payload pra todos os aparelhos do profissional e devolve quantos
// aceitaram. Inscrições que o provedor diz que não existem mais são apagadas.
export async function sendToUser(admin: Admin, userId: string, payload: string): Promise<number> {
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  let delivered = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      delivered++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      console.error("Falha ao enviar push; status:", statusCode ?? "unknown");
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return delivered;
}

// "qui., 30/10 às 14:00" no relógio de Brasília — usado no corpo das notificações.
export function formatBrtShort(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

// Notificação de pedido de agendamento novo. Marca o pedido como notificado
// antes de enviar (só quem conseguir marcar envia), então chamar duas vezes
// — pela página do paciente e pela execução de hora em hora — não duplica.
export async function notifyBookingRequest(
  admin: Admin,
  request: { id: string; user_id: string; nome: string; scheduled_at: string },
  appUrl: string,
): Promise<number> {
  const { data: claimed } = await admin
    .from("booking_requests")
    .update({ notificado_em: new Date().toISOString() })
    .eq("id", request.id)
    .is("notificado_em", null)
    .select("id");
  if (!claimed?.length) return 0;
  const payload = JSON.stringify({
    title: "Novo pedido de agendamento",
    body: `${request.nome} · ${formatBrtShort(request.scheduled_at)}`,
    url: `${appUrl}/agenda`,
  });
  return sendToUser(admin, request.user_id, payload);
}
