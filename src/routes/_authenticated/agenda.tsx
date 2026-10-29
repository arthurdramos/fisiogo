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
import { addDays, addMonths, formatDateTime, formatMonthLabel, formatTime, startOfDay, startOfMonth, toDatetimeLocalValue } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookingRequests } from "@/components/booking-requests";
import { sessionBlockClass, sessionColorClass, sessionDotClass, sessionStatusLabel } from "@/lib/session-status";
import { buildReminderMessage, confirmUrlFor, normalizeBrazilPhone, whatsappUrl } from "@/lib/whatsapp";
import { CalendarClock, Check, ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — FisioGO" }] }),
  // ?dia=AAAA-MM-DD abre direto a visão do dia — é pra onde aponta o aviso
  // da véspera ("você tem N sessões amanhã").
  validateSearch: (search: Record<string, unknown>): { dia?: string } =>
    typeof search.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.dia) ? { dia: search.dia } : {},
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

function parseDia(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function Agenda() {
  const { dia } = Route.useSearch();
  const [view, setView] = useState<ViewMode>(dia ? "dia" : "semana");
  const [anchor, setAnchor] = useState(() => (dia ? parseDia(dia) : startOfDay(new Date())));
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

  // Dados do lembrete pro paciente ficam numa consulta à parte: se a migração
  // que cria essas colunas ainda não rodou, a agenda continua funcionando,
  // só sem o botão de WhatsApp.
  const reminders = useQuery({
    queryKey: ["agenda-reminders", view, rangeStart.toISOString()],
    enabled: view === "dia" || view === "semana",
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, confirm_token, lembrete_paciente_em, paciente_resposta, patients(nome, telefone)")
        .gte("scheduled_at", rangeStart.toISOString())
        .lt("scheduled_at", rangeEnd.toISOString());
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.id, r]));
    },
  });

  const profissionalNome = useQuery({
    queryKey: ["professional-name"],
    queryFn: async () => {
      const { data } = await supabase.from("professional_profile").select("nome").maybeSingle();
      return data?.nome ?? null;
    },
  });

  const markReminded = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sessions")
        .update({ lembrete_paciente_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda-reminders"] }),
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
  const canRemind = (s: { status: string; scheduled_at: string }) =>
    s.status === "agendada" && new Date(s.scheduled_at).getTime() > Date.now();
  const showReminderHint = !!reminders.data && dayList.some(canRemind);
  const showWeekReminderHint = !!reminders.data && (sessions.data ?? []).some(canRemind);

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

      <BookingRequests profissionalNome={profissionalNome.data ?? null} />

      {view === "dia" && (
        <div className="rounded-xl border border-border bg-card">
          {showReminderHint && (
            <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground">
              Toque em <span className="font-medium text-foreground">WhatsApp</span> para lembrar o paciente. A
              mensagem já abre pronta, com um link para ele confirmar ou pedir para remarcar.
            </p>
          )}
          <ul className="divide-y divide-border">
            {dayList.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma sessão neste dia.</li>
            )}
            {dayList.map((s) => {
              const patient = s.patients as { nome: string } | null;
              const reminder = reminders.data?.get(s.id);
              return (
                <li key={s.id} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/40">
                  <Link to="/pacientes/$id" params={{ id: s.patient_id }} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{patient?.nome ?? "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_min} min · {s.status}</p>
                  </Link>
                  {reminder && (
                    <PatientReminder
                      session={s}
                      reminder={reminder}
                      canRemind={canRemind(s)}
                      profissionalNome={profissionalNome.data ?? null}
                      onSent={() => markReminded.mutate(s.id)}
                    />
                  )}
                  <span className={"shrink-0 rounded-md px-2 py-1 text-xs " + sessionColorClass(s)}>
                    {formatTime(s.scheduled_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {view === "semana" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          {showWeekReminderHint && (
            <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground">
              Toque numa sessão para lembrar o paciente pelo{" "}
              <span className="font-medium text-foreground">WhatsApp</span>.
            </p>
          )}
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
                      const reminder = reminders.data?.get(s.id);
                      // Tocar na sessão abre um cartão com os detalhes, o lembrete
                      // pelo WhatsApp e o atalho pra ficha — em vez de ir direto
                      // pra ficha, que agora é um toque a mais.
                      return (
                        <Popover key={s.id}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={"absolute left-[3px] right-[3px] overflow-hidden rounded-md px-2 py-1 text-left text-[11px] leading-tight shadow " + sessionBlockClass(s)}
                              style={{ top, height }}
                            >
                              <span className="block font-mono font-semibold opacity-90">{formatTime(s.scheduled_at)}</span>
                              <span className={"block truncate font-medium" + (reminder ? " pr-4" : "")}>
                                {patient?.nome ?? "Paciente"}
                              </span>
                              {reminder && <ReminderMark reminder={reminder} />}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72">
                            <SessionDetails
                              session={s}
                              patientName={patient?.nome ?? "Paciente"}
                              reminder={reminder}
                              canRemind={canRemind(s)}
                              profissionalNome={profissionalNome.data ?? null}
                              onSent={() => markReminded.mutate(s.id)}
                            />
                          </PopoverContent>
                        </Popover>
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

type ReminderRow = {
  confirm_token: string;
  lembrete_paciente_em: string | null;
  paciente_resposta: string | null;
  patients: { nome: string; telefone: string | null } | { nome: string; telefone: string | null }[] | null;
};

// Link wa.me com o lembrete pronto pra esse paciente, ou null se a ficha não
// tem um telefone utilizável.
function reminderHref(reminder: ReminderRow, scheduledAt: string, profissionalNome: string | null) {
  const patient = Array.isArray(reminder.patients) ? reminder.patients[0] : reminder.patients;
  const phone = normalizeBrazilPhone(patient?.telefone);
  if (!phone) return null;
  return whatsappUrl(
    phone,
    buildReminderMessage({
      pacienteNome: patient?.nome ?? "",
      profissionalNome,
      scheduledAt,
      confirmUrl: confirmUrlFor(reminder.confirm_token),
    }),
  );
}

// Ícone no canto do bloco da semana: confirmou, pediu pra remarcar ou já
// foi lembrado. Sem ícone = ainda não foi lembrado.
function ReminderMark({ reminder }: { reminder: ReminderRow }) {
  const base = "absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full";
  if (reminder.paciente_resposta === "confirmada") {
    return (
      <span className={base + " bg-white text-emerald-600"} title="Paciente confirmou" aria-label="Paciente confirmou">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (reminder.paciente_resposta === "remarcar") {
    return (
      <span className={base + " bg-amber-400 text-white"} title="Pediu para remarcar" aria-label="Pediu para remarcar">
        <CalendarClock className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (reminder.lembrete_paciente_em) {
    return (
      <span className={base + " opacity-80"} title="Lembrete enviado" aria-label="Lembrete enviado">
        <MessageCircle className="h-3 w-3" />
      </span>
    );
  }
  return null;
}

// Conteúdo do cartão que abre ao tocar numa sessão na visão de semana.
function SessionDetails({
  session,
  patientName,
  reminder,
  canRemind,
  profissionalNome,
  onSent,
}: {
  session: { patient_id: string; scheduled_at: string; duration_min: number; status: string; pago: boolean };
  patientName: string;
  reminder: ReminderRow | undefined;
  canRemind: boolean;
  profissionalNome: string | null;
  onSent: () => void;
}) {
  const when = new Date(session.scheduled_at);
  const href = reminder ? reminderHref(reminder, session.scheduled_at, profissionalNome) : null;

  let reminderInfo: string | null = null;
  if (reminder?.paciente_resposta === "confirmada") reminderInfo = "O paciente confirmou a presença.";
  else if (reminder?.paciente_resposta === "remarcar") reminderInfo = "O paciente pediu para remarcar.";
  else if (reminder?.lembrete_paciente_em) reminderInfo = `Lembrete enviado em ${formatDateTime(reminder.lembrete_paciente_em)}.`;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">{patientName}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {when.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} ·{" "}
          {formatTime(session.scheduled_at)} · {session.duration_min} min
        </p>
        <span className={"mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] " + sessionColorClass(session)}>
          {sessionStatusLabel(session)}
        </span>
      </div>

      {reminderInfo && <p className="text-xs text-muted-foreground">{reminderInfo}</p>}

      {reminder && canRemind && !reminder.paciente_resposta &&
        (href ? (
          <Button asChild className="w-full">
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={onSent}>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              {reminder.lembrete_paciente_em ? "Enviar lembrete de novo" : "Lembrar no WhatsApp"}
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Cadastre o telefone do paciente para lembrar pelo WhatsApp.
          </p>
        ))}

      <Button asChild variant="outline" className="w-full">
        <Link to="/pacientes/$id" params={{ id: session.patient_id }}>
          Abrir ficha do paciente
        </Link>
      </Button>
    </div>
  );
}

// Resposta do paciente (se já respondeu) + botão que abre o WhatsApp do
// profissional com o lembrete pronto pra esse paciente.
function PatientReminder({
  session,
  reminder,
  canRemind,
  profissionalNome,
  onSent,
}: {
  session: { patient_id: string; scheduled_at: string };
  reminder: ReminderRow;
  canRemind: boolean;
  profissionalNome: string | null;
  onSent: () => void;
}) {
  const href = reminderHref(reminder, session.scheduled_at, profissionalNome);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {reminder.paciente_resposta === "confirmada" && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
          Confirmou
        </span>
      )}
      {reminder.paciente_resposta === "remarcar" && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          Pediu para remarcar
        </span>
      )}
      {canRemind && !reminder.paciente_resposta &&
        (href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSent}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            title={reminder.lembrete_paciente_em ? "Lembrete já enviado. Toque para enviar de novo." : "Lembrar pelo WhatsApp"}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {reminder.lembrete_paciente_em ? "Enviado" : "WhatsApp"}
          </a>
        ) : (
          <Link
            to="/pacientes/$id"
            params={{ id: session.patient_id }}
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            title="Cadastre o telefone do paciente para lembrar pelo WhatsApp"
          >
            Sem telefone
          </Link>
        ))}
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
