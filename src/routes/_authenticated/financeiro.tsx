import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDays,
  addMonths,
  addMonthsClamped,
  addQuarters,
  addYears,
  formatCurrency,
  formatMonthLabel,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  toDateInputValue,
} from "@/lib/format";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — FisioGO" }] }),
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

type Granularity = "semana" | "mes" | "trimestre" | "ano" | "personalizado";

type Range = { start: Date; end: Date };

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
  { value: "personalizado", label: "Personalizado" },
];

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

// Rótulo de um período — usado tanto pro atual quanto pro de comparação
// (que é sempre um Range de verdade, então o mesmo formato serve pros dois).
function periodLabel(granularity: Granularity, range: Range) {
  if (granularity === "semana" || granularity === "personalizado") {
    const lastDay = addDays(range.end, -1);
    return `${range.start.toLocaleDateString("pt-BR")} a ${lastDay.toLocaleDateString("pt-BR")}`;
  }
  if (granularity === "trimestre") {
    const q = Math.floor(range.start.getMonth() / 3) + 1;
    return `${q}º trimestre de ${range.start.getFullYear()}`;
  }
  if (granularity === "ano") return String(range.start.getFullYear());
  return formatMonthLabel(range.start);
}

function Financeiro() {
  const [granularity, setGranularity] = useState<Granularity>("mes");
  const [anchor, setAnchor] = useState(() => new Date());
  const [customStart, setCustomStart] = useState(() => toDateInputValue(startOfMonth(new Date())));
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(new Date()));

  const currentRange = useMemo((): Range => {
    switch (granularity) {
      case "personalizado": {
        const start = startOfDay(new Date(customStart + "T00:00:00"));
        const rawEnd = startOfDay(new Date(customEnd + "T00:00:00"));
        return { start, end: addDays(rawEnd < start ? start : rawEnd, 1) };
      }
      case "semana": {
        const start = startOfWeek(anchor);
        return { start, end: addDays(start, 7) };
      }
      case "trimestre": {
        const start = startOfQuarter(anchor);
        return { start, end: addQuarters(start, 1) };
      }
      case "ano": {
        const start = startOfYear(anchor);
        return { start, end: addYears(start, 1) };
      }
      default: {
        const start = startOfMonth(anchor);
        return { start, end: addMonths(start, 1) };
      }
    }
  }, [granularity, anchor, customStart, customEnd]);

  // Período de comparação: pro "personalizado", espelha o mesmo intervalo de
  // dias um mês antes (ex: 01-17/08 -> 01-17/07); pros demais, é só o
  // período anterior de mesmo tamanho (semana/mês/trimestre/ano anterior).
  const previousRange = useMemo((): Range => {
    switch (granularity) {
      case "personalizado":
        return { start: addMonthsClamped(currentRange.start, -1), end: addMonthsClamped(currentRange.end, -1) };
      case "semana":
        return { start: addDays(currentRange.start, -7), end: currentRange.start };
      case "trimestre":
        return { start: addQuarters(currentRange.start, -1), end: currentRange.start };
      case "ano":
        return { start: addYears(currentRange.start, -1), end: currentRange.start };
      default:
        return { start: addMonths(currentRange.start, -1), end: currentRange.start };
    }
  }, [granularity, currentRange]);

  const goPrev = () => {
    if (granularity === "semana") setAnchor(addDays(anchor, -7));
    else if (granularity === "trimestre") setAnchor(addQuarters(anchor, -1));
    else if (granularity === "ano") setAnchor(addYears(anchor, -1));
    else setAnchor(addMonths(anchor, -1));
  };
  const goNext = () => {
    if (granularity === "semana") setAnchor(addDays(anchor, 7));
    else if (granularity === "trimestre") setAnchor(addQuarters(anchor, 1));
    else if (granularity === "ano") setAnchor(addYears(anchor, 1));
    else setAnchor(addMonths(anchor, 1));
  };
  const goToday = () => setAnchor(new Date());

  const sessions = useQuery({
    queryKey: ["financeiro-sessions", previousRange.start.toISOString(), currentRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, status, scheduled_at, valor_cobrado, custo_registrado")
        .gte("scheduled_at", previousRange.start.toISOString())
        .lt("scheduled_at", currentRange.end.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as unknown as SessionRow[];
    },
  });

  const current = useMemo(() => {
    const rows = (sessions.data ?? []).filter((s) => {
      const t = new Date(s.scheduled_at);
      return t >= currentRange.start && t < currentRange.end;
    });
    return summarize(rows);
  }, [sessions.data, currentRange]);

  const previous = useMemo(() => {
    const rows = (sessions.data ?? []).filter((s) => {
      const t = new Date(s.scheduled_at);
      return t >= previousRange.start && t < previousRange.end;
    });
    return summarize(rows);
  }, [sessions.data, previousRange]);

  // "À receber": soma de todos os agendamentos confirmados (não cancelados) ainda não
  // pagos, de qualquer mês — não é escopado ao mês selecionado, é um saldo corrente,
  // igual ao quadrante equivalente na ficha do paciente.
  const receivable = useQuery({
    queryKey: ["financeiro-a-receber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("valor_cobrado, patients(valor_sessao)")
        .neq("status", "cancelada")
        .eq("pago", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const aReceber = useMemo(() => {
    return (receivable.data ?? []).reduce(
      (acc, s) => acc + Number(s.valor_cobrado ?? s.patients?.valor_sessao ?? 0),
      0,
    );
  }, [receivable.data]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Financeiro</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{periodLabel(granularity, currentRange)}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center rounded-md border border-border p-0.5">
          {GRANULARITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setGranularity(value)}
              className={
                "rounded px-3 py-1.5 text-xs font-medium transition-colors " +
                (granularity === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {granularity === "personalizado" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">À receber</p>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={"mt-2 font-mono text-2xl font-semibold " + (aReceber > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
          {formatCurrency(aReceber)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Soma de todos os agendamentos confirmados ainda não pagos, de qualquer mês
        </p>
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
        <h2 className="font-serif text-lg font-semibold">Comparativo com o período anterior</h2>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{periodLabel(granularity, previousRange)}</p>
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
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
      {Trend && (
        <p className={"mt-1 flex items-center gap-1 text-xs " + (isPositive ? "text-emerald-600" : "text-destructive")}>
          <Trend className="h-3 w-3" />
          <span className="font-mono">{Math.abs(change).toFixed(0)}%</span> vs. período anterior
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
          Período anterior: <span className="font-mono">{isCurrency ? formatCurrency(previous) : previous}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-semibold">{isCurrency ? formatCurrency(current) : current}</p>
        <p className={"font-mono text-xs " + (isPositive ? "text-emerald-600" : "text-destructive")}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
