import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "./format";

export type SessionStatusInfo = {
  status: string;
  pago: boolean;
  scheduled_at: string;
};

export function sessionColorClass(s: SessionStatusInfo): string {
  if (s.status === "cancelada") {
    return "bg-muted text-muted-foreground line-through";
  }
  if (s.status !== "realizada") {
    return "bg-primary/10 text-primary hover:bg-primary/15";
  }
  if (s.pago) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  const sessionMonth = startOfMonth(new Date(s.scheduled_at));
  const currentMonth = startOfMonth(new Date());
  if (sessionMonth < currentMonth) {
    return "bg-destructive/15 text-destructive";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
}

// Variante com fundo sólido (em vez do tom claro de sessionColorClass), usada
// nos blocos posicionados por horário da grade semanal da Agenda — precisam
// de mais contraste porque ficam sobre o fundo da coluna do dia, não num chip.
export function sessionBlockClass(s: SessionStatusInfo): string {
  if (s.status === "cancelada") {
    return "bg-muted-foreground/50 text-white line-through";
  }
  if (s.status !== "realizada") {
    return "bg-primary text-primary-foreground";
  }
  if (s.pago) {
    return "bg-emerald-600 text-white";
  }
  const sessionMonth = startOfMonth(new Date(s.scheduled_at));
  const currentMonth = startOfMonth(new Date());
  if (sessionMonth < currentMonth) {
    return "bg-destructive text-white";
  }
  return "bg-amber-500 text-white";
}

export function sessionDotClass(s: SessionStatusInfo): string {
  if (s.status === "cancelada") {
    return "bg-muted-foreground/40";
  }
  if (s.status !== "realizada") {
    return "bg-primary";
  }
  if (s.pago) {
    return "bg-emerald-500";
  }
  const sessionMonth = startOfMonth(new Date(s.scheduled_at));
  const currentMonth = startOfMonth(new Date());
  if (sessionMonth < currentMonth) {
    return "bg-destructive";
  }
  return "bg-amber-500";
}

export function sessionStatusLabel(s: SessionStatusInfo): string {
  if (s.status === "cancelada") return "Cancelada";
  if (s.status !== "realizada") return "Agendada";
  if (s.pago) return "Pago";
  const sessionMonth = startOfMonth(new Date(s.scheduled_at));
  const currentMonth = startOfMonth(new Date());
  return sessionMonth < currentMonth ? "Em atraso" : "Pendente";
}

export function calcularSaldo(
  payments: Array<{ valor: number }>,
  sessoesCreditadas: Array<{ valor_cobrado: number | null }>,
): number {
  const depositado = payments.reduce((acc, p) => acc + Number(p.valor), 0);
  const consumido = sessoesCreditadas.reduce((acc, s) => acc + Number(s.valor_cobrado ?? 0), 0);
  return depositado - consumido;
}

// Marca uma sessão como realizada, carimbando o valor/custo do paciente
// naquele instante e abatendo do saldo automaticamente se houver crédito
// suficiente. Compartilhado entre a lista de sessões do paciente e a
// página de confirmação via notificação push.
export async function markSessionRealizada(sessionId: string, patientId: string) {
  const { data: patientRow, error: pErr } = await supabase
    .from("patients")
    .select("valor_sessao, custo_sessao")
    .eq("id", patientId)
    .single();
  if (pErr) throw pErr;

  const { data: payments, error: payErr } = await supabase
    .from("patient_payments")
    .select("valor")
    .eq("patient_id", patientId);
  if (payErr) throw payErr;

  const { data: creditedSessions, error: sErr } = await supabase
    .from("sessions")
    .select("valor_cobrado")
    .eq("patient_id", patientId)
    .eq("pago_via", "credito");
  if (sErr) throw sErr;

  const saldo = calcularSaldo(payments ?? [], creditedSessions ?? []);
  const valorSessao = patientRow.valor_sessao ?? 0;
  const cobrirComCredito = valorSessao > 0 && saldo >= valorSessao;

  const { error } = await supabase
    .from("sessions")
    .update({
      status: "realizada",
      valor_cobrado: patientRow.valor_sessao,
      custo_registrado: patientRow.custo_sessao,
      pago: cobrirComCredito,
      pago_via: cobrirComCredito ? "credito" : null,
      pago_em: cobrirComCredito ? new Date().toISOString() : null,
    })
    .eq("id", sessionId);
  if (error) throw error;
}
