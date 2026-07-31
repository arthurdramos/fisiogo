import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { addMonths, formatCurrency, formatMonthLabel, startOfMonth } from "@/lib/format";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — FisioFlow" }] }),
  component: Financeiro,
});

type SessionRow = {
  id: string;
  status: string;
  scheduled_at: string;
  valor_cobrado: number | null;
  custo_registrado: number | null;
};

type Summary = { faturado: number; despesas: number; atendimentos: number; lucro: number };

function summarize(rows: SessionRow[]): Summary {
  let faturado = 0;
  let despesas = 0;
  let atendimentos = 0;
  for (const r of rows) {
    if (r.status !== "realizada") continue;
    atendimentos += 1;
    faturado += Number(r.valor_cobrado ?? 0);
    despesas += Number(r.custo_registrado ?? 0);
  }
  return { faturado, despesas, atendimentos, lucro: faturado - despesas };
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function Financeiro() {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const prevMonthStart = useMemo(() => addMonths(monthStart, -1), [monthStart]);
  const nextMonthStart = useMemo(() => addMonths(monthStart, 1), [monthStart]);

  const sessions = useQuery({
    queryKey: ["financeiro-sessions", monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, status, scheduled_at, valor_cobrado, custo_registrado")
        .gte("scheduled_at", prevMonthStart.toISOString())
        .lt("scheduled_at", nextMonthStart.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as unknown as SessionRow[];
    },
  });

  const current = useMemo(() => {
    const rows = (sessions.data ?? []).filter((s) => {
      const t = new Date(s.scheduled_at);
      return t >= monthStart && t < nextMonthStart;
    });
    return summarize(rows);
  }, [sessions.data, monthStart, nextMonthStart]);

  const previous = useMemo(() => {
    const rows = (sessions.data ?? []).filter((s) => {
      const t = new Date(s.scheduled_at);
      return t >= prevMonthStart && t < monthStart;
    });
    return summarize(rows);
  }, [sessions.data, prevMonthStart, monthStart]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Financeiro</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{formatMonthLabel(monthStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthStart(startOfMonth(new Date()))}>
            Este mês
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMonthStart(addMonths(monthStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Valor faturado"
          value={formatCurrency(current.faturado)}
          change={pctChange(current.faturado, previous.faturado)}
          icon={DollarSign}
        />
        <MetricCard
          label="Despesas"
          value={formatCurrency(current.despesas)}
          change={pctChange(current.despesas, previous.despesas)}
          icon={Wallet}
          invert
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(current.lucro)}
          change={pctChange(current.lucro, previous.lucro)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Atendimentos realizados"
          value={String(current.atendimentos)}
          change={pctChange(current.atendimentos, previous.atendimentos)}
          icon={CalendarCheck}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Comparativo com o mês anterior</h2>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{formatMonthLabel(prevMonthStart)}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ComparisonRow label="Valor faturado" current={current.faturado} previous={previous.faturado} isCurrency />
          <ComparisonRow label="Despesas" current={current.despesas} previous={previous.despesas} isCurrency invert />
          <ComparisonRow label="Lucro" current={current.lucro} previous={previous.lucro} isCurrency />
          <ComparisonRow
            label="Atendimentos realizados"
            current={current.atendimentos}
            previous={previous.atendimentos}
          />
        </div>
      </div>

      {sessions.isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  invert,
}: {
  label: string;
  value: string;
  change: number;
  icon: LucideIcon;
  invert?: boolean;
}) {
  const isPositive = invert ? change <= 0 : change >= 0;
  const Trend = change === 0 ? null : isPositive ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {Trend && (
        <p className={"mt-1 flex items-center gap-1 text-xs " + (isPositive ? "text-emerald-600" : "text-destructive")}>
          <Trend className="h-3 w-3" />
          {Math.abs(change).toFixed(0)}% vs. mês anterior
        </p>
      )}
    </div>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  isCurrency,
  invert,
}: {
  label: string;
  current: number;
  previous: number;
  isCurrency?: boolean;
  invert?: boolean;
}) {
  const change = pctChange(current, previous);
  const isPositive = invert ? change <= 0 : change >= 0;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Mês anterior: {isCurrency ? formatCurrency(previous) : previous}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-semibold">{isCurrency ? formatCurrency(current) : current}</p>
        <p className={"text-xs " + (isPositive ? "text-emerald-600" : "text-destructive")}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
