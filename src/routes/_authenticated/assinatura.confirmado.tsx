import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

// Tela de transição logo depois do pagamento (Cakto/Mercado Pago redirecionam
// pra cá). O webhook que ativa a assinatura é assíncrono — pode levar alguns
// segundos a mais que o redirecionamento do navegador — então aqui a gente
// fica consultando o status por um tempo antes de liberar o botão, em vez de
// simplesmente mostrar "ativo"/"inativo" na cara (ou pior, deixar o guard do
// app jogar o usuário de volta pra /assinatura). Ver _authenticated/route.tsx,
// que isenta essa rota da checagem de assinatura ativa.
const POLL_MS = 2000;
const MAX_POLLS = 8; // ~16s de tentativa antes de desistir de esperar

export const Route = createFileRoute("/_authenticated/assinatura/confirmado")({
  head: () => ({ meta: [{ title: "Pagamento confirmado — FisioGO" }] }),
  component: AssinaturaConfirmada,
});

function AssinaturaConfirmada() {
  const navigate = useNavigate();
  const pollCount = useRef(0);

  const subscription = useQuery({
    queryKey: ["subscription-confirmado"],
    queryFn: async () => {
      pollCount.current += 1;
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, plano")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const confirmed = status === "ativo" || status === "cortesia";
      if (confirmed || pollCount.current >= MAX_POLLS) return false;
      return POLL_MS;
    },
  });

  const sub = subscription.data;
  const confirmed = sub?.status === "ativo" || sub?.status === "cortesia";
  const timedOut = !confirmed && !subscription.isLoading && pollCount.current >= MAX_POLLS;
  const planoLabel = sub?.plano === "anual" ? "Anual" : sub?.plano === "mensal" ? "Mensal" : null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center p-6 pt-20 text-center md:pt-28">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
        {confirmed ? (
          <CheckCircle2 className="h-8 w-8 text-primary" />
        ) : (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        )}
      </div>

      <h1 className="mt-6 font-serif text-2xl font-semibold">
        {confirmed ? "Pagamento confirmado!" : "Confirmando seu pagamento..."}
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        {confirmed
          ? `Sua assinatura${planoLabel ? ` ${planoLabel}` : ""} está ativa. Você já pode aproveitar o FisioGO sem limites.`
          : timedOut
            ? "Pode levar mais alguns instantes pra confirmar — mas já dá pra seguir usando o sistema normalmente."
            : "Isso leva só alguns segundos."}
      </p>

      <Button size="lg" className="mt-8" onClick={() => navigate({ to: "/app" })}>
        Ir para o FisioGO
      </Button>
    </div>
  );
}
