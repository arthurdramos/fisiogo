import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import {
  buildBookingAcceptedMessage,
  buildBookingDeclinedMessage,
  confirmUrlFor,
  whatsappUrl,
} from "@/lib/whatsapp";
import { extractErrorMessage } from "@/lib/utils";
import { CalendarPlus, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

type Pedido = { id: string; nome: string; telefone: string; scheduled_at: string; duration_min: number };
// Pedido já respondido nesta tela: fica visível com o botão de avisar o
// paciente pelo WhatsApp até o profissional dispensar.
type Respondido = Pedido & { status: "aceito" | "recusado"; href: string };

// Pedidos da página pública de agendamento (Perfil → Agendamento online)
// esperando resposta. Aparece no topo da Agenda em qualquer visão.
export function BookingRequests({ profissionalNome }: { profissionalNome: string | null }) {
  const qc = useQueryClient();
  const [respondidos, setRespondidos] = useState<Respondido[]>([]);

  const pedidos = useQuery({
    queryKey: ["booking-requests"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("id, nome, telefone, scheduled_at, duration_min")
        .eq("status", "pendente")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const slug = useQuery({
    queryKey: ["booking-slug"],
    retry: false,
    queryFn: async () => {
      const { data } = await supabase.from("booking_settings").select("slug").maybeSingle();
      return data?.slug ?? null;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["booking-requests"] });
    qc.invalidateQueries({ queryKey: ["agenda-sessions"] });
    qc.invalidateQueries({ queryKey: ["agenda-reminders"] });
    qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
  };

  const aceitar = useMutation({
    mutationFn: async (p: Pedido) => {
      const { data, error } = await supabase.rpc("accept_booking_request", { p_id: p.id });
      if (error) throw error;
      const { confirm_token } = data as { confirm_token: string };
      const text = buildBookingAcceptedMessage({
        pacienteNome: p.nome,
        profissionalNome,
        scheduledAt: p.scheduled_at,
        confirmUrl: confirmUrlFor(confirm_token),
      });
      return { ...p, status: "aceito" as const, href: whatsappUrl(p.telefone, text) };
    },
    onSuccess: (r) => {
      toast.success("Sessão agendada");
      setRespondidos((prev) => [...prev, r]);
      refresh();
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e) ?? "Não foi possível aceitar o pedido");
      refresh();
    },
  });

  const recusar = useMutation({
    mutationFn: async (p: Pedido) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: "recusado", respondido_em: new Date().toISOString() })
        .eq("id", p.id)
        .eq("status", "pendente");
      if (error) throw error;
      const text = buildBookingDeclinedMessage({
        pacienteNome: p.nome,
        profissionalNome,
        scheduledAt: p.scheduled_at,
        bookingUrl: slug.data ? `${window.location.origin}/agendar/${slug.data}` : null,
      });
      return { ...p, status: "recusado" as const, href: whatsappUrl(p.telefone, text) };
    },
    onSuccess: (r) => {
      setRespondidos((prev) => [...prev, r]);
      refresh();
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Não foi possível recusar o pedido"),
  });

  const pendentes = (pedidos.data ?? []).filter((p) => !respondidos.some((r) => r.id === p.id));
  if (pendentes.length === 0 && respondidos.length === 0) return null;
  const ocupado = aceitar.isPending || recusar.isPending;

  return (
    <div className="mb-6 rounded-xl border border-primary/30 bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <CalendarPlus className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">
          Pedidos de agendamento{pendentes.length > 0 ? ` (${pendentes.length})` : ""}
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {pendentes.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.nome}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(p.scheduled_at)} · {p.duration_min} min
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" disabled={ocupado} onClick={() => recusar.mutate(p)}>
                Recusar
              </Button>
              <Button size="sm" disabled={ocupado} onClick={() => aceitar.mutate(p)}>
                Aceitar
              </Button>
            </div>
          </li>
        ))}
        {respondidos.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.nome}</p>
              <p className="text-xs text-muted-foreground">
                {r.status === "aceito" ? "Aceito" : "Recusado"} · {formatDateTime(r.scheduled_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild size="sm" variant="outline">
                <a href={r.href} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Avisar no WhatsApp
                </a>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Dispensar"
                aria-label="Dispensar"
                onClick={() => setRespondidos((prev) => prev.filter((x) => x.id !== r.id))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
