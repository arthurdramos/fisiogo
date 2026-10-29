// Edge Function: avisa o profissional, por push, de um pedido de agendamento
// que acabou de chegar pela página pública /agendar/<slug>. Chamada pela
// própria página logo depois de request_booking, sem login (verify_jwt
// desligado em config.toml): a credencial é o token público do pedido, e
// cada pedido só gera um aviso — se esta chamada falhar, a execução de hora
// em hora de send-session-reminders reenvia.
//
// Segredos necessários: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY; APP_URL opcional.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { notifyBookingRequest } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://fisiogo.online";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let token: unknown;
  try {
    ({ token } = await req.json());
  } catch {
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }
  if (typeof token !== "string" || !/^[0-9a-f]{32}$/.test(token)) {
    return new Response("Bad request", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: pedido } = await admin
    .from("booking_requests")
    .select("id, user_id, nome, scheduled_at")
    .eq("public_token", token)
    .eq("status", "pendente")
    .maybeSingle();

  const enviados = pedido ? await notifyBookingRequest(admin, pedido, APP_URL) : 0;
  return new Response(JSON.stringify({ enviados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
