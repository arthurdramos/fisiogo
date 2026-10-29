// Edge Function: varre sessões agendadas cujo horário + 1h já passou e ainda
// não foram confirmadas, e envia um lembrete push perguntando se aconteceram.
//
// Chamada a cada hora pelo pg_cron, com chave privada armazenada no Vault.
//
// Segredos necessários:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — gerados com `npx web-push generate-vapid-keys`
//   APP_URL — opcional, URL pública do app (usada no link da notificação)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { reminderWindow } from "./timing.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://fisiogo.online";

webpush.setVapidDetails("mailto:contato@fisiogo.online", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = req.headers.get("x-reminder-key");
  if (!token) return new Response("Unauthorized", { status: 401 });
  const { data: authorized, error: authError } = await admin.rpc("verify_session_reminder_key", { candidate: token });
  if (authError || authorized !== true) return new Response("Unauthorized", { status: 401 });

  const window = reminderWindow(Date.now());

  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, user_id, scheduled_at, patient_id, patients(nome)")
    .eq("status", "agendada")
    .eq("lembrete_enviado", false)
    .gte("scheduled_at", window.start)
    .lt("scheduled_at", window.end);

  if (error) {
    console.error("Erro ao buscar sessões:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let enviados = 0;

  for (const s of sessions ?? []) {
    let delivered = false;
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", s.user_id);

    // O join `patients(nome)` pode voltar como objeto (relação pra um) ou como
    // lista, dependendo de como o tipo do banco resolve a FK — aceitamos os dois.
    const patientRel = s.patients as { nome: string } | { nome: string }[] | null;
    const patientName =
      (Array.isArray(patientRel) ? patientRel[0]?.nome : patientRel?.nome) ?? "Paciente";
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
        delivered = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        console.error("Falha ao enviar push; status:", statusCode ?? "unknown");
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    if (delivered) {
      const { error: updateError } = await admin.from("sessions").update({ lembrete_enviado: true }).eq("id", s.id);
      if (updateError) return new Response(JSON.stringify({ error: "Failed to record reminder delivery" }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ sessoes: sessions?.length ?? 0, notificacoes_enviadas: enviados }), {
    headers: { "Content-Type": "application/json" },
  });
});
