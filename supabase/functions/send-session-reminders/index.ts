// Edge Function: varre sessões agendadas cujo horário + 1h já passou e ainda
// não foram confirmadas, e envia um lembrete push perguntando se aconteceram.
// Na execução das 18h (Brasília) também avisa o profissional das sessões do
// dia seguinte, pra ele lembrar os pacientes pelo WhatsApp a partir da agenda.
// E reenvia o aviso de pedidos de agendamento que a página do paciente não
// conseguiu notificar na hora. Por fim, manda um e-mail de reengajamento pra
// quem se cadastrou há 48h+ e ainda não cadastrou nenhum paciente.
//
// Chamada a cada hora pelo pg_cron, com chave privada em tabela restrita.
//
// Segredos necessários:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — gerados com `npx web-push generate-vapid-keys`
//   APP_URL — opcional, URL pública do app (usada no link da notificação)
//   RESEND_API_KEY — pro e-mail de reengajamento (opcional: sem ela, só esse envio é pulado)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyBookingRequest, sendToUser } from "../_shared/push.ts";
import { reminderWindow, tomorrowDigest } from "./timing.ts";
import { buildReengagementEmail, REENGAGEMENT_EMAIL_SUBJECT } from "../_shared/reengagement-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://fisiogo.online";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendReengagementEmail(email: string, nome: string | null): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY ausente — pulando e-mail de reengajamento.");
    return false;
  }
  const { text, html } = buildReengagementEmail(nome);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FisioGO <naoresponda@fisiogo.online>",
        to: [email],
        subject: REENGAGEMENT_EMAIL_SUBJECT,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Erro ao enviar e-mail de reengajamento:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Erro ao enviar e-mail de reengajamento:", err);
    return false;
  }
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

  // ========== pedidos de agendamento sem aviso ==========
  // Normalmente a página do paciente já avisou na hora; aqui fica a rede de
  // segurança pra quando aquela chamada falhou.
  let avisosPedidos = 0;
  const { data: pedidos, error: pedidosError } = await admin
    .from("booking_requests")
    .select("id, user_id, nome, scheduled_at")
    .eq("status", "pendente")
    .is("notificado_em", null)
    .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  if (pedidosError) console.error("Erro ao buscar pedidos de agendamento:", pedidosError.message);
  for (const pedido of pedidos ?? []) avisosPedidos += await notifyBookingRequest(admin, pedido, APP_URL);

  // ========== e-mail de reengajamento (48h sem nenhum paciente cadastrado) ==========
  // Janela de 48h a 30 dias: o limite superior evita reprocessar pra sempre
  // contas antigas que nunca vão se encaixar (já engajaram ou já sumiram).
  let reengajamentosEnviados = 0;
  const { data: candidatos, error: candidatosError } = await admin
    .from("subscriptions")
    .select("user_id, created_at")
    .is("reengagement_email_sent_at", null)
    .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .gt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  if (candidatosError) console.error("Erro ao buscar candidatos a reengajamento:", candidatosError.message);

  for (const sub of candidatos ?? []) {
    const { count, error: countError } = await admin
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id);
    if (countError) {
      console.error("Erro ao contar pacientes do usuário", sub.user_id, countError.message);
      continue;
    }
    if ((count ?? 0) > 0) continue; // já cadastrou paciente: não é "pouco uso"

    const { data: userRes } = await admin.auth.admin.getUserById(sub.user_id);
    const email = userRes?.user?.email;
    if (!email) continue;

    const { data: profile } = await admin
      .from("professional_profile")
      .select("nome")
      .eq("user_id", sub.user_id)
      .maybeSingle();
    const primeiroNome = profile?.nome?.trim().split(/\s+/)[0] ?? null;

    const enviado = await sendReengagementEmail(email, primeiroNome);
    if (enviado) {
      const { error: updateError } = await admin
        .from("subscriptions")
        .update({ reengagement_email_sent_at: new Date().toISOString() })
        .eq("user_id", sub.user_id);
      if (updateError) {
        console.error("Erro ao marcar reengajamento enviado:", sub.user_id, updateError.message);
        continue;
      }
      reengajamentosEnviados++;
    }
  }

  return new Response(
    JSON.stringify({
      sessoes: sessions?.length ?? 0,
      notificacoes_enviadas: enviados,
      avisos_vespera: avisosVespera,
      avisos_pedidos: avisosPedidos,
      reengajamentos_enviados: reengajamentosEnviados,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
