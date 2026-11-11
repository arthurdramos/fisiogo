// Link curto da bio do Instagram: fisiogo.online/insta.
//
// A bio mostra o endereço inteiro, então um link com ?utm_source=... ali
// parece spam. Esta rota fica com o endereço limpo e só redireciona (302)
// pra home com as UTMs, pra dar pra separar quem veio do perfil de quem veio
// de anúncio (o Meta Pixel e qualquer analytics leem as UTMs da URL).
// 302 e no-store de propósito: se um dia o destino mudar, ninguém fica preso
// num redirecionamento antigo em cache.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const DESTINO = "/?utm_source=instagram&utm_medium=bio&utm_campaign=perfil";

export const Route = createFileRoute("/insta")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(null, {
          status: 302,
          headers: { Location: new URL(DESTINO, request.url).toString(), "Cache-Control": "no-store" },
        }),
    },
  },
});
