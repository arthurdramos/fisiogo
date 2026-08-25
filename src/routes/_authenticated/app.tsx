import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, startOfDay, addDays } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Início — FisioGO" }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = startOfDay(new Date());
  const in7 = addDays(today, 7);

  const upcoming = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, scheduled_at, status, duration_min, patient_id, patients(nome)")
        .gte("scheduled_at", today.toISOString())
        .lt("scheduled_at", in7.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientCount = useQuery({
    queryKey: ["patient-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Início</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua semana em um olhar.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pacientes ativos</p>
              <p className="mt-1 font-mono text-3xl font-semibold">{patientCount.data ?? "—"}</p>
            </div>
            <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
              <Users className="h-[19px] w-[19px]" />
            </div>
          </div>
          <Link to="/pacientes" className="mt-4 inline-flex text-sm font-medium text-app-blue-600 hover:underline">
            Ver pacientes →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sessões nos próximos 7 dias</p>
              <p className="mt-1 font-mono text-3xl font-semibold">
                {upcoming.data?.length ?? "—"}
              </p>
            </div>
            <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
              <Calendar className="h-[19px] w-[19px]" />
            </div>
          </div>
          <Link to="/agenda" className="mt-4 inline-flex text-sm font-medium text-app-blue-600 hover:underline">
            Abrir agenda →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-lg font-semibold">Próximas sessões</h2>
          <Link to="/agenda">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nova sessão
            </Button>
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {upcoming.isLoading && (
            <li className="p-5 text-sm text-muted-foreground">Carregando...</li>
          )}
          {upcoming.data?.length === 0 && (
            <li className="flex flex-col items-center gap-3 px-6 py-9 text-center">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Calendar className="h-[26px] w-[26px]" />
              </div>
              <div>
                <p className="font-medium">Nenhuma sessão marcada por enquanto</p>
                <p className="mx-auto mt-1 max-w-[320px] text-sm text-muted-foreground">
                  Sua agenda dos próximos 7 dias está livre. Toque em "Nova sessão" para marcar o primeiro
                  atendimento da semana.
                </p>
              </div>
            </li>
          )}
          {upcoming.data?.map((s) => {
            const patient = s.patients as { nome: string } | null;
            return (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium">{patient?.nome ?? "Paciente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.scheduled_at)} · {s.duration_min} min · {s.status}
                  </p>
                </div>
                <Link
                  to="/pacientes/$id"
                  params={{ id: s.patient_id }}
                  className="text-xs text-primary hover:underline"
                >
                  Ver paciente
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
