import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { markSessionRealizada } from "@/lib/session-status";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/confirmar/$sessionId")({
  head: () => ({ meta: [{ title: "Confirmar sessão — FisioGO" }] }),
  component: ConfirmarSessao,
});

function ConfirmarSessao() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["confirm-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, scheduled_at, status, patient_id, patients(nome)")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const confirm = useMutation({
    mutationFn: async (aconteceu: boolean) => {
      if (!session.data) return;
      if (aconteceu) {
        await markSessionRealizada(session.data.id, session.data.patient_id);
      }
    },
    onSuccess: (_data, aconteceu) => {
      toast.success(aconteceu ? "Sessão marcada como realizada" : "Tudo bem, deixamos como agendada");
      navigate({ to: "/agenda" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (session.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (!session.data) return <div className="p-10 text-center text-sm">Sessão não encontrada.</div>;

  const s = session.data;
  const patient = s.patients as { nome: string } | null;

  if (s.status !== "agendada") {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-muted-foreground">Esta sessão já foi atualizada (status: {s.status}).</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/agenda" })}>
          Voltar pra agenda
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="font-display text-2xl font-semibold">A sessão aconteceu?</h1>
      <p className="mt-2 text-muted-foreground">
        {patient?.nome ?? "Paciente"} · {formatDateTime(s.scheduled_at)}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => confirm.mutate(true)} disabled={confirm.isPending}>
          Sim, aconteceu
        </Button>
        <Button variant="outline" onClick={() => confirm.mutate(false)} disabled={confirm.isPending}>
          Não aconteceu
        </Button>
      </div>
    </div>
  );
}
