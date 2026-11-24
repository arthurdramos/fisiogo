import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel interno — FisioGO" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Row = {
  id: string; email: string; nome: string | null; created_at: string; last_sign_in_at: string | null;
  provider: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  referrer: string | null; sub_status: string | null; trial_ends_at: string | null; plano: string | null;
  pacientes: number; sessoes: number; planos: number; agendamento: boolean; ultima_atividade: string | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";

function estagio(r: Row) {
  if (!r.last_sign_in_at) return "Nunca entrou";
  if (r.sessoes > 0) return "Marcou sessão";
  if (r.pacientes > 0) return "Paciente sem sessão";
  return "Entrou sem paciente";
}

function origem(r: Row) {
  if (r.utm_source) return [r.utm_source, r.utm_medium].filter(Boolean).join(" / ");
  if (r.referrer) { try { return new URL(r.referrer).hostname; } catch { return r.referrer; } }
  return "Direto";
}

function statusTeste(r: Row) {
  if (r.sub_status === "ativo") return `Pagante${r.plano ? ` (${r.plano})` : ""}`;
  if (r.sub_status === "cortesia") return "Cortesia";
  if (!r.trial_ends_at) return "—";
  const dias = Math.ceil((new Date(r.trial_ends_at).getTime() - Date.now()) / 86400000);
  return dias > 0 ? `Teste: ${dias}d restantes` : "Teste vencido";
}

function Admin() {
  const [busca, setBusca] = useState("");
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    retry: false,
  });

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return (data ?? []).filter((r) => !q || r.email?.toLowerCase().includes(q) || r.nome?.toLowerCase().includes(q));
  }, [data, busca]);

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando…</p>;
  if (error) return <p className="p-6 text-muted-foreground">Acesso restrito à equipe FisioGO.</p>;

  const semana = (data ?? []).filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000);
  const cards = [
    ["Cadastros (7 dias)", semana.length],
    ["Chegaram à 1ª sessão (7 dias)", semana.filter((r) => r.sessoes > 0).length],
    ["Total de contas", data?.length ?? 0],
    ["Pagantes", (data ?? []).filter((r) => r.sub_status === "ativo").length],
  ] as const;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Painel interno</h1>
        <p className="text-sm text-muted-foreground">Cadastros, origem e uso — visível só para a equipe.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>{["Profissional", "Cadastro", "Último acesso", "Origem", "Estágio", "Pac.", "Sess.", "Planos", "Agend.", "Teste"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2"><div className="font-medium">{r.nome || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                <td className="whitespace-nowrap px-3 py-2">{fmt(r.created_at)}<div className="text-xs text-muted-foreground">{r.provider}</div></td>
                <td className="whitespace-nowrap px-3 py-2">{fmt(r.last_sign_in_at)}</td>
                <td className="px-3 py-2">{origem(r)}{r.utm_campaign && <div className="text-xs text-muted-foreground">{r.utm_campaign}</div>}</td>
                <td className="whitespace-nowrap px-3 py-2">{estagio(r)}</td>
                <td className="px-3 py-2">{r.pacientes}</td>
                <td className="px-3 py-2">{r.sessoes}</td>
                <td className="px-3 py-2">{r.planos}</td>
                <td className="px-3 py-2">{r.agendamento ? "Sim" : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{statusTeste(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
