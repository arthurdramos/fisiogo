import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPushPermissionState, subscribeToPush } from "@/lib/push";
import { formatCPF } from "@/lib/format";
import { extractErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — FisioGO" }] }),
  component: Perfil,
});

function Perfil() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    crefito: "",
    telefone: "",
    banco: "",
    agencia: "",
    conta: "",
    chave_pix: "",
  });
  const [loaded, setLoaded] = useState(false);

  const profile = useQuery({
    queryKey: ["professional-profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("professional_profile")
        .select("*")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data && !loaded) {
      setForm({
        nome: profile.data.nome ?? "",
        cpf: profile.data.cpf ?? "",
        crefito: profile.data.crefito ?? "",
        telefone: profile.data.telefone ?? "",
        banco: profile.data.banco ?? "",
        agencia: profile.data.agencia ?? "",
        conta: profile.data.conta ?? "",
        chave_pix: profile.data.chave_pix ?? "",
      });
      setLoaded(true);
    }
  }, [profile.data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Sem sessão");
      const { error } = await supabase.from("professional_profile").upsert({
        user_id,
        nome: form.nome || null,
        cpf: form.cpf || null,
        crefito: form.crefito || null,
        telefone: form.telefone || null,
        banco: form.banco || null,
        agencia: form.agencia || null,
        conta: form.conta || null,
        chave_pix: form.chave_pix || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil salvo");
      qc.invalidateQueries({ queryKey: ["professional-profile"] });
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro"),
  });

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esses dados aparecem automaticamente nos relatórios de cobrança gerados para seus pacientes.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-serif font-semibold">Dados profissionais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={form.cpf}
                placeholder="000.000.000-00"
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>CREFITO</Label>
              <Input value={form.crefito} onChange={(e) => setForm({ ...form, crefito: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-serif font-semibold">Dados bancários</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <NotificacoesSection />
      </div>
    </div>
  );
}

function NotificacoesSection() {
  const [status, setStatus] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(getPushPermissionState());
  }, []);

  const ativar = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      toast.success("Lembretes ativados neste navegador");
      setStatus("granted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ativar lembretes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-serif font-semibold">Notificações</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Receba um lembrete 1h após o horário de cada sessão perguntando se ela aconteceu.
      </p>
      {status === "unsupported" && (
        <p className="text-sm text-muted-foreground">Este navegador não suporta notificações push.</p>
      )}
      {status === "granted" && <p className="text-sm text-emerald-600">Lembretes ativados neste navegador.</p>}
      {(status === "default" || status === "denied") && (
        <Button type="button" onClick={ativar} disabled={busy}>
          {busy ? "Ativando..." : "Ativar lembretes"}
        </Button>
      )}
      {status === "denied" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Permissão negada anteriormente — habilite notificações para este site nas configurações do navegador.
        </p>
      )}
    </div>
  );
}
