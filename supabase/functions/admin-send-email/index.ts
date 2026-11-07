// Edge Function: manda um e-mail avulso via Resend, usando o mesmo
// RESEND_API_KEY já configurado pro resto do projeto (fale-conosco,
// e-mail de boas-vindas, confirmação de pagamento). Ferramenta interna —
// NUNCA chamada pelo frontend, só manualmente (curl/Postman) por quem
// administra o projeto, pra casos avulsos (ex: reenviar algo pra alguém
// que ficou travado no cadastro).
//
// Protegida pelo mesmo ADMIN_TOOL_SECRET de admin-confirm-email.
//
// Uso: POST com header "Authorization: Bearer <ADMIN_TOOL_SECRET>" e corpo
// { "to": "pessoa@exemplo.com", "subject": "...", "text": "...", "html": "..." (opcional) }

import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_TOOL_SECRET = Deno.env.get("ADMIN_TOOL_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ADMIN_TOOL_SECRET) {
    return new Response(JSON.stringify({ error: "ADMIN_TOOL_SECRET não configurado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${ADMIN_TOOL_SECRET}`) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { to?: string; subject?: string; text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { to, subject, text, html } = body;
  if (!to || !subject || (!text && !html)) {
    return new Response(JSON.stringify({ error: "to, subject e text (ou html) são obrigatórios" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FisioGO <naoresponda@fisiogo.online>",
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Erro ao enviar e-mail avulso via Resend:", errBody);
    return new Response(JSON.stringify({ error: "Erro ao enviar e-mail." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, to }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
