import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, addMonths, formatMonthLabel, formatTime, startOfDay, startOfMonth, toDatetimeLocalValue } from "@/lib/format";
import { sessionBlockClass, sessionColorClass, sessionDotClass } from "@/lib/session-status";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — FisioGO" }] }),
  component: Agenda,
});

type ViewMode = "dia" | "semana" | "mes";

const HOUR_PX = 56;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

function weekStartOf(d: Date) {
  const start = startOfDay(d);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function Agenda() {
  const [view, setView] = useState<ViewMode>("semana");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState(false);

  const qc = useQueryClient();

  const weekStart = useMemo(() => weekStartOf(anchor), [anchor]);
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const monthEnd = useMemo(() => addMonths(monthStart, 1), [monthStart]);

  const rangeStart = view === "dia" ? anchor : view === "semana" ? weekStart : monthStart;
  const rangeEnd = view === "dia" ? addDays(anchor, 1) : view === "semana" ? addDays(weekStart, 7) : monthEnd;

  const goPrev = () => {
    if (view === "dia") setAnchor(addDays(anchor, -1));
    else if (view === "semana") setAnchor(addDays(anchor, -7));
    else setAnchor(addMonths(anchor, -1));
  };
  const goNext = () => {
    if (view === "dia") setAnchor(addDays(anchor, 1));
    else if (view === "semana") setAnchor(addDays(anchor, 7));
    else setAnchor(addMonths(anchor, 1));
  };
  const goToday = () => setAnchor(startOfDay(new Date()));

  const sessions = useQuery({
    queryKey: ["agenda-sessions", view, rangeStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, scheduled_at, duration_min, status, pago, patient_id, patients(nome)")
        .gte("scheduled_at", rangeStart.toISOString())
        .lt("scheduled_at", rangeEnd.toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (v: { patient_id: string; scheduled_at: string; duration_min: number }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      const { error } = await supabase.from("sessions").insert({
        user_id,
        patient_id: v.patient_id,
        scheduled_at: new Date(v.scheduled_at).toISOString(),
        duration_min: v.duration_min,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sessão agendada");
      qc.invalidateQueries({ queryKey: ["agenda-sessions"] });
      qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
      qc.invalidateQueries({ queryKey: ["financeiro-a-receber"] });
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro"),
  });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthGridDays = useMemo(() => {
    const gridStart = weekStartOf(monthStart);
    const days: Date[] = [];
    let d = gridStart;
    while (d < monthEnd || d.getDay() !== 0) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [monthStart, monthEnd]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof sessions.data>();
    (sessions.data ?? []).forEach((s) => {
      const k = new Date(s.scheduled_at).toDateString();
      if (!map.has(k)) map.set(k, []);
      map.get(k)?.push(s);
    });
    return map;
  }, [sessions.data]);

  const dayList = byDay.get(anchor.toDateString()) ?? [];

  // Faixa de horas exibida na grade da semana — cobre 07h-21h por padrão e se
  // estica automaticamente se alguma sessão do período começar ou terminar
  // fora desse intervalo, pra nunca cortar um atendimento fora do grid.
  const hourBounds = useMemo(() => {
    let start = DEFAULT_START_HOUR;
    let end = DEFAULT_END_HOUR;
    (sessions.data ?? []).forEach((s) => {
      const d = new Date(s.scheduled_at);
      const startHour = d.getHours();
      const endHour = Math.ceil(d.getHours() + d.getMinutes() / 60 + s.duration_min / 60);
      if (startHour < start) start = startHour;
      if (endHour > end) end = endHour;
    });
    return { start, end };
  }, [sessions.data]);

  const hours = useMemo(
    () => Array.from({ length: hourBounds.end - hourBounds.start }, (_, i) => hourBounds.start + i),
    [hourBounds],
  );

  const headerLabel =
    view === "dia"
      ? anchor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : view === "semana"
        ? `Semana de ${weekStart.toLocaleDateString("pt-BR")}`
        : formatMonthLabel(monthStart);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Agenda</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border p-0.5">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={
                  "rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                  (view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {v === "mes" ? "Mês" : v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> Nova sessão</Button>
            </DialogTrigger>
            <NewSessionDialog patients={patients.data ?? []} onSubmit={create.mutate} loading={create.isPending} />
          </Dialog>
        </div>
      </div>

      {view === "dia" && (
        <div className="rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {dayList.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma sessão neste dia.</li>
            )}
            {dayList.map((s) => {
              const patient = s.patients as { nome: string } | null;
              return (
                <li key={s.id}>
                  <Link
                    to="/pacientes/$id"
                    params={{ id: s.patient_id }}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent/40"
                  >
                    <div>
                      <p className="font-medium">{patient?.nome ?? "Paciente"}</p>
                      <p className="text-xs text-muted-foreground">{s.duration_min} min · {s.status}</p>
                    </div>
                    <span className={"rounded-md px-2 py-1 text-xs " + sessionColorClass(s)}>
                      {formatTime(s.scheduled_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {view === "semana" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="min-w-[720px]">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
              <div />
              {weekDays.map((d) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setAnchor(d); setView("dia"); }}
                    className={"border-l border-border py-2.5 text-center hover:bg-accent/40 " + (isToday ? "bg-accent" : "")}
                  >
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                      {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                    </p>
                    <p className={"mt-0.5 font-mono text-lg font-semibold " + (isToday ? "text-primary" : "")}>
                      {d.getDate()}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
              <div className="flex flex-col">
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_PX }}
                    className="-translate-y-[7px] pr-2 text-right font-mono text-[11px] text-muted-foreground"
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {weekDays.map((d) => {
                const list = byDay.get(d.toDateString()) ?? [];
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={d.toISOString()}
                    className={"relative border-l border-border " + (isToday ? "bg-accent/20" : "")}
                    style={{ height: hours.length * HOUR_PX }}
                  >
                    {hours.map((_, i) => (
                      <div key={i} style={{ height: HOUR_PX }} className="border-b border-dashed border-border" />
                    ))}
                    {list.map((s) => {
                      const patient = s.patients as { nome: string } | null;
                      const start = new Date(s.scheduled_at);
                      const minutesFromStart = (start.getHours() - hourBounds.start) * 60 + start.getMinutes();
                      const top = (minutesFromStart / 60) * HOUR_PX;
                      const height = Math.max((s.duration_min / 60) * HOUR_PX, 22);
                      return (
                        <Link
                          key={s.id}
                          to="/pacientes/$id"
                          params={{ id: s.patient_id }}
                          className={"absolute left-[3px] right-[3px] overflow-hidden rounded-md px-2 py-1 text-[11px] leading-tight shadow " + sessionBlockClass(s)}
                          style={{ top, height }}
                        >
                          <span className="block font-mono font-semibold opacity-90">{formatTime(s.scheduled_at)}</span>
                          <span className="block truncate font-medium">{patient?.nome ?? "Paciente"}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "mes" && (
        <div className="rounded-xl border border-border bg-card p-2">
          <div className="grid grid-cols-7 gap-px pb-1 text-center text-xs uppercase tracking-wide text-muted-foreground">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {monthGridDays.map((d) => {
              const list = byDay.get(d.toDateString()) ?? [];
              const isToday = d.toDateString() === new Date().toDateString();
              const inMonth = d.getMonth() === monthStart.getMonth();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => { setAnchor(d); setView("dia"); }}
                  className={
                    "min-h-[84px] rounded-md border p-1.5 text-left align-top transition-colors hover:bg-accent/40 " +
                    (isToday ? "border-primary/60" : "border-border") +
                    (inMonth ? "" : " opacity-40")
                  }
                >
                  <p className={"text-xs font-medium " + (isToday ? "text-primary" : "")}>{d.getDate()}</p>
                  {list.length > 0 && (
                    <>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {list.slice(0, 8).map((s) => (
                          <span key={s.id} className={"h-1.5 w-1.5 rounded-full " + sessionDotClass(s)} />
                        ))}
                        {list.length > 8 && (
                          <span className="text-[10px] text-muted-foreground">+{list.length - 8}</span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {list.length} {list.length === 1 ? "sessão" : "sessões"}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NewSessionDialog({
  patients,
  onSubmit,
  loading,
}: {
  patients: Array<{ id: string; nome: string }>;
  onSubmit: (v: { patient_id: string; scheduled_at: string; duration_min: number }) => void;
  loading: boolean;
}) {
  const [patient_id, setPatientId] = useState("");
  const [scheduled_at, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toDatetimeLocalValue(d);
  });
  const [duration_min, setDuration] = useState(50);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova sessão</DialogTitle></DialogHeader>
      {patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre um paciente antes de agendar sessões.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!patient_id) return;
            onSubmit({ patient_id, scheduled_at, duration_min });
          }}
        >
          <div className="space-y-2">
            <Label>Paciente *</Label>
            <Select value={patient_id} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={scheduled_at} onChange={(e) => setWhen(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={10} step={5} value={duration_min} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !patient_id}>Agendar</Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}
