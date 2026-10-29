// Server route: a sessão do paciente como um evento iCalendar, pro botão
// "iPhone / outro calendário" da página de confirmação (/c/<token>). Usa o
// mesmo token e a mesma função do banco da página, então expõe só o que ela
// já mostra: primeiro nome, profissional, horário e duração. Chave pública,
// sem service role.

import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { buildCalendar, sessionEnd } from "@/lib/ical";

export const Route = createFileRoute("/api/public/session/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f]{32}$/.test(params.token)) return new Response("Not found", { status: 404 });

        const { data } = await supabase.rpc("get_session_by_confirm_token", { p_token: params.token });
        const s = data?.[0];
        if (!s || s.status === "cancelada") return new Response("Not found", { status: 404 });

        const profissional = s.profissional_nome || "seu fisioterapeuta";
        const ics = buildCalendar({
          name: "Fisioterapia",
          events: [
            {
              uid: `sessao-${params.token}@fisiogo.online`,
              start: new Date(s.scheduled_at),
              end: sessionEnd(s.scheduled_at, s.duration_min),
              summary: `Fisioterapia com ${profissional}`,
              description: `Sessão de ${s.duration_min} min. Para remarcar, fale com ${profissional}.`,
            },
          ],
        });

        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="sessao-fisioterapia.ics"',
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
