// Server route: calendário do profissional em formato iCalendar, pra assinar
// no Google Agenda, Outlook ou iPhone (Perfil → Calendário). O token do link é
// a única credencial — quem tem o link vê a agenda, por isso dá pra gerar um
// novo no Perfil, o que invalida o antigo.
//
// Vai do FisioGO pro calendário externo, só nesse sentido. As sessões vêm da
// função get_calendar_feed (de 60 dias atrás até 1 ano à frente, sem as
// canceladas), chamada com a chave pública — esta rota não usa service role.

import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { buildCalendar, sessionEnd, type IcsEvent } from "@/lib/ical";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/api/public/calendar/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f]{32}$/.test(params.token)) return new Response("Not found", { status: 404 });

        const { data: sessions, error } = await supabase.rpc("get_calendar_feed", { p_token: params.token });
        if (error) {
          console.error("Erro ao montar calendário:", error.message);
          return new Response("Erro ao montar o calendário", { status: 500 });
        }

        const events: IcsEvent[] = (sessions ?? []).map((s) => {
          const description =
            s.status === "realizada"
              ? "Sessão realizada."
              : s.paciente_resposta === "confirmada"
                ? "O paciente confirmou a presença."
                : s.paciente_resposta === "remarcar"
                  ? "O paciente pediu para remarcar."
                  : undefined;
          return {
            uid: `${s.session_id}@fisiogo.online`,
            start: new Date(s.scheduled_at),
            end: sessionEnd(s.scheduled_at, s.duration_min),
            summary: `Sessão · ${s.so_iniciais ? initials(s.paciente_nome) : s.paciente_nome}`,
            description,
            lastModified: new Date(s.updated_at),
          };
        });

        return new Response(buildCalendar({ name: "FisioGO", events }), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="fisiogo.ics"',
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
