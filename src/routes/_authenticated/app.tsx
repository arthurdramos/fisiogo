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
          <h1 className="font-display text-3xl font-semibold">Início</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua semana em um olhar.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pacientes ativos</p>
              <p className="mt-1 font-display text-3xl font-semibold">{patientCount.data ?? "—"}</p>
            </div>
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <Link to="/pacientes" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Ver pacientes →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sessões nos próximos 7 dias</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                {upcoming.data?.length ?? "—"}
              </p>
            </div>
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <Link to="/agenda" className="mt-4 inline-flex text-sm text-primary hover:underline">
            Abrir agenda →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Próximas sessões</h2>
          <Link to="/agenda">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Nova sessão
            </Button>
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {upcoming.isLoading && (
            <li className="p-5 text-sm text-muted-foreground">Carregando...</li>
          )}
          {upcoming.data?.length === 0 && (
            <li className="p-5 text-sm text-muted-foreground">Nenhuma sessão agendada para os próximos 7 dias.</li>
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
