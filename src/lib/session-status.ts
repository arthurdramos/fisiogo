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
