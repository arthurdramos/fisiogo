import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeSlots, formatBrtDay, formatBrtTime, type BookingHour, type BusyInterval } from "@/lib/booking";
import { normalizeBrazilPhone } from "@/lib/whatsapp";
import { extractErrorMessage } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";

// Página pública de agendamento do profissional (Perfil → Agendamento online).
// Qualquer pessoa vê os horários livres e pede um; o pedido só vira sessão
// quando o profissional aceita na Agenda. Sem login: tudo passa pelas funções
// get_booking_page e request_booking do banco.
export const Route = createFileRoute("/agendar/$slug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Agendar sessão — FisioGO" }] }),
  component: AgendarPage,
});

type PageData = {
  profissional_nome: string | null;
  duracao_min: number;
  antecedencia_horas: number;
  janela_dias: number;
  horarios: BookingHour[];
  ocupados: BusyInterval[];
};

const DIAS_INICIAIS = 7;

function AgendarPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const [slot, setSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviado, setEnviado] = useState<string | null>(null);
  const [todosOsDias, setTodosOsDias] = useState(false);

  const page = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_page", { p_slug: slug });
      if (error) throw error;
      return (data as PageData | null) ?? null;
    },
  });

  const days = useMemo(
    () =>
      page.data
        ? computeSlots({
            hours: page.data.horarios,
            busy: page.data.ocupados,
            duracaoMin: page.data.duracao_min,
            janelaDias: page.data.janela_dias,
            antecedenciaHoras: page.data.antecedencia_horas,
          })
        : [],
    [page.data],
  );

  const pedir = useMutation({
    mutationFn: async () => {
      const phone = normalizeBrazilPhone(telefone);
      if (!phone) throw new Error("Informe seu WhatsApp com DDD, por exemplo (11) 98765-4321.");
      const { data, error } = await supabase.rpc("request_booking", {
        p_slug: slug,
        p_nome: nome,
        p_telefone: phone,
        p_inicio: slot!,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (token) => {
      setEnviado(slot);
      // Avisa o profissional na hora; se falhar, a execução de hora em hora reenvia.
      void supabase.functions.invoke("notify-booking-request", { body: { token } });
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e) ?? "Não foi possível enviar o pedido. Tente de novo.");
      qc.invalidateQueries({ queryKey: ["booking-page", slug] });
    },
  });

  const profissional = page.data?.profissional_nome || "o profissional";

  let body;
  if (page.isLoading) {
    body = <p className="text-center text-sm text-muted-foreground">Carregando horários...</p>;
  } else if (!page.data) {
    body = (
      <p className="text-center text-sm text-muted-foreground">
        Esta página de agendamento não existe ou está desativada. Fale direto com o seu fisioterapeuta.
      </p>
    );
  } else if (enviado) {
    body = (
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 font-medium text-primary">
          <CalendarCheck className="h-5 w-5" />
          Pedido enviado
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Você pediu <span className="font-medium text-foreground">{formatBrtDay(slotDay(enviado))}, às {formatBrtTime(enviado)}</span>.
          {" "}{capitalize(profissional)} vai confirmar o horário pelo WhatsApp.
        </p>
      </div>
    );
  } else if (slot) {
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          pedir.mutate();
        }}
      >
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">Horário escolhido</p>
          <p className="mt-1 font-medium">{capitalize(formatBrtDay(slotDay(slot)))}</p>
          <p className="font-mono text-2xl font-semibold">{formatBrtTime(slot)}</p>
          <button
            type="button"
            onClick={() => setSlot(null)}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Trocar horário
          </button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-nome">Seu nome</Label>
          <Input id="booking-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-telefone">Seu WhatsApp</Label>
          <Input
            id="booking-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 98765-4321"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pedir.isPending}>
          {pedir.isPending ? "Enviando..." : "Pedir este horário"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Seu nome e WhatsApp são usados só para {profissional} falar com você sobre este agendamento.
        </p>
      </form>
    );
  } else if (days.length === 0) {
    body = (
      <p className="text-center text-sm text-muted-foreground">
        Não há horários livres nos próximos {page.data.janela_dias} dias. Fale direto com {profissional}.
      </p>
    );
  } else {
    const visible = todosOsDias ? days : days.slice(0, DIAS_INICIAIS);
    body = (
      <div className="space-y-5">
        {visible.map((d) => (
          <section key={d.dia}>
            <h2 className="mb-2 font-sans text-sm font-medium">{capitalize(formatBrtDay(d.dia))}</h2>
            <div className="grid grid-cols-4 gap-2">
              {d.slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className="rounded-md border border-border bg-card py-2 font-mono text-sm transition-colors hover:border-primary hover:bg-accent"
                >
                  {formatBrtTime(s)}
                </button>
              ))}
            </div>
          </section>
        ))}
        {!todosOsDias && days.length > DIAS_INICIAIS && (
          <Button type="button" variant="outline" className="w-full" onClick={() => setTodosOsDias(true)}>
            Ver mais dias
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <img src="/logo-fisiogo-transparente.png" alt="FisioGO" className="h-9 w-auto" />
      <main className="mt-8 w-full max-w-md">
        {page.data && !enviado && (
          <div className="mb-6 text-center">
            <h1 className="font-serif text-2xl font-semibold">Agende sua sessão{page.data.profissional_nome ? ` com ${page.data.profissional_nome}` : ""}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sessões de {page.data.duracao_min} min. Escolha um horário e {profissional} confirma pelo WhatsApp.
            </p>
          </div>
        )}
        {body}
      </main>
    </div>
  );
}

// Dia (AAAA-MM-DD) de um horário no relógio de Brasília.
function slotDay(iso: string) {
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
