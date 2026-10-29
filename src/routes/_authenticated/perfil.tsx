import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPushPermissionState, subscribeToPush } from "@/lib/push";
import { subscribeUrls } from "@/lib/ical";
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

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <CalendarioSection />
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
        Receba às 18h um aviso das sessões do dia seguinte, para lembrar os pacientes pelo WhatsApp, e um lembrete 1h
        após cada sessão perguntando se ela aconteceu.
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

// Link de calendário pra assinar no Google Agenda, Outlook ou iPhone. As
// sessões vão do FisioGO pro calendário externo, só nesse sentido.
function CalendarioSection() {
  const qc = useQueryClient();

  const feed = useQuery({
    queryKey: ["calendar-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_feeds").select("token, so_iniciais").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const onSaved = () => qc.invalidateQueries({ queryKey: ["calendar-feed"] });
  const onError = (e: unknown) => toast.error(extractErrorMessage(e) ?? "Erro ao salvar");

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sem sessão");
      const { error } = await supabase.from("calendar_feeds").insert({ user_id: userRes.user.id });
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError,
  });

  const atualizar = useMutation({
    mutationFn: async (patch: { so_iniciais?: boolean; token?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sem sessão");
      const { error } = await supabase.from("calendar_feeds").update(patch).eq("user_id", userRes.user.id);
      if (error) throw error;
    },
    onSuccess: (_data, patch) => {
      if (patch.token) toast.success("Novo link gerado. Assine o calendário de novo com ele.");
      onSaved();
    },
    onError,
  });

  const feedUrl = feed.data ? `${window.location.origin}/api/public/calendar/${feed.data.token}` : "";
  const links = feedUrl ? subscribeUrls(feedUrl) : null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-serif font-semibold">Calendário</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Veja suas sessões no Google Agenda, no Outlook ou no calendário do iPhone, junto com seus outros compromissos.
      </p>

      {feed.isLoading ? null : !feed.data ? (
        <Button type="button" onClick={() => criar.mutate()} disabled={criar.isPending}>
          {criar.isPending ? "Gerando..." : "Conectar ao meu calendário"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button asChild variant="outline">
              <a href={links!.google} target="_blank" rel="noopener noreferrer">Google Agenda</a>
            </Button>
            <Button asChild variant="outline">
              <a href={links!.outlook} target="_blank" rel="noopener noreferrer">Outlook</a>
            </Button>
            <Button asChild variant="outline">
              <a href={links!.apple}>iPhone / Mac</a>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendar-feed-url">Ou copie o link e cole no seu calendário</Label>
            <div className="flex gap-2">
              <Input id="calendar-feed-url" readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" onClick={copiar}>
                Copiar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="calendar-so-iniciais" className="font-normal">
              Mostrar só as iniciais dos pacientes nos eventos
            </Label>
            <Switch
              id="calendar-so-iniciais"
              checked={feed.data.so_iniciais}
              disabled={atualizar.isPending}
              onCheckedChange={(v) => atualizar.mutate({ so_iniciais: v })}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            As sessões vão do FisioGO para o calendário, só nesse sentido. O Google pode levar algumas horas para mostrar
            mudanças; Outlook e iPhone costumam ser mais rápidos. Quem tiver este link vê sua agenda, então não o
            compartilhe.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Gerar um novo link
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Gerar um novo link?</AlertDialogTitle>
                <AlertDialogDescription>
                  O link atual para de funcionar e os calendários que o assinaram deixam de receber as sessões. Você
                  vai precisar assinar de novo com o link novo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => atualizar.mutate({ token: crypto.randomUUID().replace(/-/g, "") })}
                >
                  Gerar novo link
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
