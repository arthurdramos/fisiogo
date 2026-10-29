import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/utils";
import { googleCalendarUrl, outlookCalendarUrl, sessionEnd } from "@/lib/ical";
import { CalendarCheck, CalendarClock, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

// Página pública que o paciente abre pelo link do lembrete no WhatsApp. Não
// exige login: o token do link identifica a sessão e as duas funções do
// banco (SECURITY DEFINER) só leem/gravam o que essa página precisa.
export const Route = createFileRoute("/c/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmar sessão — FisioGO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmarPresenca,
});

type Resposta = "confirmada" | "remarcar";

function ConfirmarPresenca() {
  const { token } = Route.useParams();
  const qc = useQueryClient();

  const session = useQuery({
    queryKey: ["public-session", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_session_by_confirm_token", { p_token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const respond = useMutation({
    mutationFn: async (resposta: Resposta) => {
      const { data, error } = await supabase.rpc("respond_session_by_confirm_token", {
        p_token: token,
        p_resposta: resposta,
      });
      if (error) throw error;
      if (!data) throw new Error("Esta sessão não pode mais ser confirmada por aqui. Fale direto com seu fisioterapeuta.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-session", token] }),
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Não foi possível registrar sua resposta."),
  });

  const s = session.data;
  const profissional = s?.profissional_nome || "seu fisioterapeuta";

  let body: ReactNode;
  if (session.isLoading) {
    body = <p className="text-sm text-muted-foreground">Carregando...</p>;
  } else if (!s) {
    body = (
      <p className="text-sm text-muted-foreground">
        Não encontramos esta sessão. Confira se o link está completo ou fale direto com seu fisioterapeuta.
      </p>
    );
  } else {
    const when = new Date(s.scheduled_at);
    const dia = when.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const hora = when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const passou = when.getTime() < Date.now() - 60 * 60 * 1000;

    body = (
      <>
        <h1 className="font-serif text-2xl font-semibold">Olá, {s.paciente_primeiro_nome}!</h1>
        <p className="mt-2 text-muted-foreground">Sua sessão de fisioterapia com {profissional}:</p>
        <div className="mt-5 rounded-xl border border-border bg-card px-5 py-4">
          <p className="font-medium capitalize">{dia}</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold">{hora}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.duration_min} min</p>
        </div>

        {s.status === "cancelada" ? (
          <p className="mt-6 text-sm text-muted-foreground">Esta sessão foi cancelada.</p>
        ) : s.status === "realizada" || passou ? (
          <p className="mt-6 text-sm text-muted-foreground">Esta sessão já aconteceu.</p>
        ) : s.paciente_resposta === "confirmada" ? (
          <Answered
            icon={<CalendarCheck className="h-5 w-5" />}
            title="Presença confirmada"
            text={`Obrigado! ${capitalize(profissional)} já vê sua confirmação na agenda.`}
            onChange={() => respond.mutate("remarcar")}
            changeLabel="Na verdade, preciso remarcar"
            loading={respond.isPending}
          >
            <AddToCalendar
              token={token}
              title={`Fisioterapia com ${profissional}`}
              start={when}
              end={sessionEnd(s.scheduled_at, s.duration_min)}
              details={`Sessão de ${s.duration_min} min. Para remarcar, fale com ${profissional}.`}
            />
          </Answered>
        ) : s.paciente_resposta === "remarcar" ? (
          <Answered
            icon={<CalendarClock className="h-5 w-5" />}
            title="Pedido de remarcação enviado"
            text={`${capitalize(profissional)} vai falar com você para combinar um novo horário.`}
            onChange={() => respond.mutate("confirmada")}
            changeLabel="Na verdade, vou conseguir ir"
            loading={respond.isPending}
          />
        ) : (
          <div className="mt-6 grid gap-3">
            <Button size="lg" onClick={() => respond.mutate("confirmada")} disabled={respond.isPending}>
              Confirmo minha presença
            </Button>
            <Button size="lg" variant="outline" onClick={() => respond.mutate("remarcar")} disabled={respond.isPending}>
              Preciso remarcar
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <img src="/logo-fisiogo-transparente.png" alt="FisioGO" className="h-9 w-auto" />
      <main className="mt-10 w-full max-w-sm text-center">{body}</main>
    </div>
  );
}

function Answered({
  icon,
  title,
  text,
  onChange,
  changeLabel,
  loading,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onChange: () => void;
  changeLabel: string;
  loading: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-2 font-medium text-primary">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {children}
      <button
        type="button"
        onClick={onChange}
        disabled={loading}
        className="mt-5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
      >
        {changeLabel}
      </button>
    </div>
  );
}

// Depois de confirmar, o paciente salva a sessão no próprio calendário. Não é
// um convite: se a sessão for remarcada, o evento salvo não muda sozinho.
function AddToCalendar({
  token,
  title,
  start,
  end,
  details,
}: {
  token: string;
  title: string;
  start: Date;
  end: Date;
  details: string;
}) {
  const ev = { title, start, end, details };
  const linkClass =
    "inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent";
  return (
    <div className="mt-6 rounded-xl border border-border bg-card/60 p-4">
      <p className="flex items-center justify-center gap-2 text-sm font-medium">
        <CalendarPlus className="h-4 w-4" />
        Adicionar à minha agenda
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a className={linkClass} href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">
          Google
        </a>
        <a className={linkClass} href={outlookCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">
          Outlook
        </a>
        <a className={linkClass} href={`/api/public/session/${token}`}>
          iPhone
        </a>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        &quot;iPhone&quot; também funciona em outros calendários: baixa um arquivo da sessão.
      </p>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
