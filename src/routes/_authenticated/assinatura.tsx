import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({ meta: [{ title: "Assinatura — FisioGO" }] }),
  component: Assinatura,
});

function Assinatura() {
  const [loadingPlan, setLoadingPlan] = useState<"mensal" | "anual" | null>(null);

  const subscription = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subscribe = async (plano: "mensal" | "anual") => {
    setLoadingPlan(plano);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-preapproval", {
        body: { plano },
      });
      if (error) throw error;
      if (!data?.init_point) throw new Error("Não foi possível iniciar o checkout");
      window.location.href = data.init_point;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar assinatura");
      setLoadingPlan(null);
    }
  };

  const sub = subscription.data;
  const trialActive = !!sub && sub.status === "trial" && new Date(sub.trial_ends_at) > new Date();
  const daysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isActive = sub?.status === "ativo";
  const cortesia = sub?.status === "cortesia";

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-semibold">Assinatura</h1>
        {isActive && (
          <p className="mt-2 text-sm text-emerald-600">
            Sua assinatura está ativa ({sub.plano === "anual" ? "plano anual" : "plano mensal"}).
          </p>
        )}
        {cortesia && (
          <p className="mt-2 text-sm text-emerald-600">
            Acesso cortesia liberado — sem necessidade de assinatura.
          </p>
        )}
        {!isActive && !cortesia && trialActive && (
          <p className="mt-2 text-sm text-muted-foreground">
            Você está no período de teste — {daysLeft} dia(s) restante(s).
          </p>
        )}
        {!isActive && !cortesia && !trialActive && (
          <p className="mt-2 text-sm text-destructive">
            Seu período de teste terminou. Assine um plano para continuar usando o FisioGO.
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">Mensal</h2>
          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(29.9)}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => subscribe("mensal")}
            disabled={loadingPlan !== null || isActive || cortesia}
          >
            {loadingPlan === "mensal" ? "Redirecionando..." : "Assinar mensal"}
          </Button>
        </div>
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-semibold">Anual</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              2 meses grátis
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(299)}
            <span className="text-sm font-normal text-muted-foreground">/ano</span>
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => subscribe("anual")}
            disabled={loadingPlan !== null || isActive || cortesia}
          >
            {loadingPlan === "anual" ? "Redirecionando..." : "Assinar anual"}
          </Button>
        </div>
      </div>
    </div>
  );
}
