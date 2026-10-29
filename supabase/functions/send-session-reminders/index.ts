// Edge Function: varre sessões agendadas cujo horário + 1h já passou e ainda
// não foram confirmadas, e envia um lembrete push perguntando se aconteceram.
// Na execução das 18h (Brasília) também avisa o profissional das sessões do
// dia seguinte, pra ele lembrar os pacientes pelo WhatsApp a partir da agenda.
//
// Chamada a cada hora pelo pg_cron, com chave privada em tabela restrita.
//
// Segredos necessários:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — gerados com `npx web-push generate-vapid-keys`
//   APP_URL — opcional, URL pública do app (usada no link da notificação)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { reminderWindow, tomorrowDigest } from "./timing.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://fisiogo.online";

webpush.setVapidDetails("mailto:contato@fisiogo.online", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type Admin = ReturnType<typeof createClient>;

// Envia o payload pra todos os aparelhos do profissional e devolve quantos
// aceitaram. Inscrições que o provedor diz que não existem mais são apagadas.
async function sendToUser(admin: Admin, userId: string, payload: string): Promise<number> {
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

    const delivered = await sendToUser(admin, s.user_id, payload);
    enviados += delivered;

    if (delivered > 0) {
      const { error: updateError } = await admin.from("sessions").update({ lembrete_enviado: true }).eq("id", s.id);
      if (updateError) return new Response(JSON.stringify({ error: "Failed to record reminder delivery" }), { status: 500 });
    }
  }

  // ========== aviso da véspera ==========
  // Conta, por profissional, as sessões de amanhã cujo paciente ainda não foi
  // lembrado nem respondeu, e manda um push levando pra agenda daquele dia.
  let avisosVespera = 0;
  const digest = tomorrowDigest(Date.now());
  if (digest) {
    const { data: amanha, error: amanhaError } = await admin
      .from("sessions")
      .select("user_id")
      .eq("status", "agendada")
      .is("lembrete_paciente_em", null)
      .is("paciente_resposta", null)
      .gte("scheduled_at", digest.start)
      .lt("scheduled_at", digest.end);
    if (amanhaError) console.error("Erro ao buscar sessões de amanhã:", amanhaError.message);

    const porProfissional = new Map<string, number>();
    for (const s of amanha ?? []) porProfissional.set(s.user_id, (porProfissional.get(s.user_id) ?? 0) + 1);

    for (const [userId, total] of porProfissional) {
      // Registra antes de enviar: se a função rodar duas vezes na mesma hora,
      // a segunda inserção bate na chave primária e o aviso não sai repetido.
      const { data: registrado, error: digestError } = await admin
        .from("patient_reminder_digests")
        .upsert({ user_id: userId, dia: digest.dia }, { onConflict: "user_id,dia", ignoreDuplicates: true })
        .select("user_id");
      if (digestError) {
        console.error("Erro ao registrar aviso da véspera:", digestError.message);
        continue;
      }
      if (!registrado?.length) continue;

      const payload = JSON.stringify({
        title: total === 1 ? "1 sessão amanhã" : `${total} sessões amanhã`,
        body: "Toque para lembrar seus pacientes pelo WhatsApp.",
        url: `${APP_URL}/agenda?dia=${digest.dia}`,
      });
      avisosVespera += await sendToUser(admin, userId, payload);
    }
  }

  return new Response(
    JSON.stringify({ sessoes: sessions?.length ?? 0, notificacoes_enviadas: enviados, avisos_vespera: avisosVespera }),
    { headers: { "Content-Type": "application/json" } },
  );
});
