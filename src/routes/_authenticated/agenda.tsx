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
import { addDays, formatTime, startOfDay, toDatetimeLocalValue } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — FisioFlow" }] }),
  component: Agenda,
});

function Agenda() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - d.getDay()); // domingo
    return d;
  });
  const weekEnd = addDays(weekStart, 7);
  const [open, setOpen] = useState(false);

  const qc = useQueryClient();

  const sessions = useQuery({
    queryKey: ["week-sessions", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, scheduled_at, duration_min, status, patient_id, patients(nome)")
        .gte("scheduled_at", weekStart.toISOString())
        .lt("scheduled_at", weekEnd.toISOString())
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
      qc.invalidateQueries({ queryKey: ["week-sessions"] });
      qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof sessions.data>();
    days.forEach((d) => map.set(d.toDateString(), []));
    (sessions.data ?? []).forEach((s) => {
      const k = new Date(s.scheduled_at).toDateString();
      map.get(k)?.push(s);
    });
    return map;
  }, [sessions.data, days]);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Semana de {weekStart.toLocaleDateString("pt-BR")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const d = startOfDay(new Date());
            d.setDate(d.getDate() - d.getDay());
            setWeekStart(d);
          }}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
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

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(d.toDateString()) ?? [];
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={d.toISOString()} className={"rounded-xl border bg-card " + (isToday ? "border-primary/60" : "border-border")}>
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                </p>
                <p className={"font-display text-lg font-semibold " + (isToday ? "text-primary" : "")}>
                  {d.getDate()}
                </p>
              </div>
              <ul className="min-h-[80px] space-y-1 p-2">
                {list.length === 0 && (
                  <li className="px-1 py-2 text-xs text-muted-foreground">—</li>
                )}
                {list.map((s) => {
                  const patient = s.patients as { nome: string } | null;
                  return (
                    <li key={s.id}>
                      <Link
                        to="/pacientes/$id"
                        params={{ id: s.patient_id }}
                        className={
                          "block rounded-md px-2 py-1.5 text-xs transition-colors " +
                          (s.status === "cancelada"
                            ? "bg-muted text-muted-foreground line-through"
                            : s.status === "realizada"
                              ? "bg-accent text-accent-foreground"
                              : "bg-primary/10 text-primary hover:bg-primary/15")
                        }
                      >
                        <p className="font-medium">{formatTime(s.scheduled_at)}</p>
                        <p className="truncate">{patient?.nome ?? "Paciente"}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
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
