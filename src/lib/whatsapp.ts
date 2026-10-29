import { addDays, formatTime, startOfDay } from "./format";

// Lembrete de sessão pro paciente pelo WhatsApp do próprio profissional:
// montamos um link wa.me com a mensagem pronta e o profissional só toca em
// "enviar". Sem API paga, sem aprovação da Meta, e a mensagem chega de um
// número que o paciente já conhece.

// Aceita o telefone do jeito que foi digitado na ficha ("(11) 98765-4321",
// "011987654321", "+55 11 98765-4321"...) e devolve no formato do wa.me
// (55 + DDD + número). Retorna null se não parecer um telefone brasileiro.
export function normalizeBrazilPhone(telefone: string | null | undefined): string | null {
  const digits = (telefone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

// "hoje", "amanhã" ou "na quinta-feira, 30/10" — relativo ao dia de `now`.
export function sessionDayPhrase(scheduledAt: string, now = new Date()): string {
  const day = startOfDay(new Date(scheduledAt)).getTime();
  const today = startOfDay(now);
  if (day === today.getTime()) return "hoje";
  if (day === addDays(today, 1).getTime()) return "amanhã";
  const d = new Date(scheduledAt);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `na ${weekday}, ${date}`;
}

export function buildReminderMessage(v: {
  pacienteNome: string;
  profissionalNome: string | null;
  scheduledAt: string;
  confirmUrl: string;
  now?: Date;
}): string {
  const primeiroNome = v.pacienteNome.trim().split(/\s+/)[0] || "tudo bem";
  const quando = sessionDayPhrase(v.scheduledAt, v.now);
  const lines = [
    `Olá, ${primeiroNome}! Passando para lembrar da sua sessão de fisioterapia ${quando} às ${formatTime(v.scheduledAt)}.`,
    "",
    `Pode confirmar sua presença por aqui? ${v.confirmUrl}`,
  ];
  if (v.profissionalNome) lines.push("", v.profissionalNome);
  return lines.join("\n");
}

export function confirmUrlFor(token: string, origin = window.location.origin): string {
  return `${origin}/c/${token}`;
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
