// Edge Function: varre sessões agendadas cujo horário + 1h já passou e ainda
// não foram confirmadas, e envia um lembrete push perguntando se aconteceram.
//
// Feita pra ser chamada periodicamente (a cada 5-10min) por um agendador
// (Jobs do Lovable Cloud / pg_cron / cron externo — a definir).
//
// Segredos necessários:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — gerados com `npx web-push generate-vapid-keys`
//   APP_URL — opcional, URL pública do app (usada no link da notificação)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://clinic-hub-mvp.lovable.app";

webpush.setVapidDetails("mailto:contato@fisioflow.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (_req) => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = Date.now();
  const windowStart = new Date(now - 70 * 60 * 1000); // 1h10 atrás
  const windowEnd = new Date(now - 60 * 60 * 1000); // 1h atrás

  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, user_id, scheduled_at, patient_id, patients(nome)")
    .eq("status", "agendada")
    .eq("lembrete_enviado", false)
    .gte("scheduled_at", windowStart.toISOString())
    .lt("scheduled_at", windowEnd.toISOString());

  if (error) {
    console.error("Erro ao buscar sessões:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let enviados = 0;

  for (const s of sessions ?? []) {
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", s.user_id);

    const patientName = (s.patients as { nome: string } | null)?.nome ?? "Paciente";
    const payload = JSON.stringify({
      title: "A sessão aconteceu?",
      body: `${patientName} — confirme se a sessão foi realizada.`,
      url: `${APP_URL}/confirmar/${s.id}`,
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        enviados++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        console.error("Falha ao enviar push:", err);
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await admin.from("sessions").update({ lembrete_enviado: true }).eq("id", s.id);
  }

  return new Response(JSON.stringify({ sessoes: sessions?.length ?? 0, notificacoes_enviadas: enviados }), {
    headers: { "Content-Type": "application/json" },
  });
});
