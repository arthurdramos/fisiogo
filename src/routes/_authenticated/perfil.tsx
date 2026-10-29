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
import { isValidSlug, slugify } from "@/lib/booking";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <AgendamentoSection />
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

// Ordem de exibição: segunda a domingo (weekday 0 = domingo, como no banco).
const WEEKDAYS = [
  { weekday: 1, label: "Segunda" },
  { weekday: 2, label: "Terça" },
  { weekday: 3, label: "Quarta" },
  { weekday: 4, label: "Quinta" },
  { weekday: 5, label: "Sexta" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

type DayHours = { on: boolean; inicio: string; fim: string };
type BookingForm = {
  ativo: boolean;
  slug: string;
  duracao_min: number;
  antecedencia_horas: number;
  janela_dias: number;
  dias: Record<number, DayHours>;
};

const DEFAULT_DIAS: Record<number, DayHours> = Object.fromEntries(
  WEEKDAYS.map(({ weekday }) => [weekday, { on: weekday >= 1 && weekday <= 5, inicio: "08:00", fim: "18:00" }]),
);

// Página pública /agendar/<endereço> onde pacientes pedem horários. Cada
// pedido chega na Agenda pra aceitar ou recusar.
function AgendamentoSection() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BookingForm | null>(null);

  const data = useQuery({
    queryKey: ["booking-settings"],
    queryFn: async () => {
      const [settings, hours, profile] = await Promise.all([
        supabase.from("booking_settings").select("*").maybeSingle(),
        supabase.from("booking_hours").select("weekday, inicio, fim"),
        supabase.from("professional_profile").select("nome").maybeSingle(),
      ]);
      if (settings.error) throw settings.error;
      if (hours.error) throw hours.error;
      return { settings: settings.data, hours: hours.data ?? [], nome: profile.data?.nome ?? "" };
    },
  });

  useEffect(() => {
    if (!data.data || form) return;
    const { settings, hours, nome } = data.data;
    if (!settings) {
      setForm({ ativo: true, slug: slugify(nome), duracao_min: 50, antecedencia_horas: 12, janela_dias: 21, dias: DEFAULT_DIAS });
      return;
    }
    const dias: Record<number, DayHours> = Object.fromEntries(
      WEEKDAYS.map(({ weekday }) => {
        const h = hours.find((x) => x.weekday === weekday);
        return [
          weekday,
          h ? { on: true, inicio: h.inicio.slice(0, 5), fim: h.fim.slice(0, 5) } : { on: false, inicio: "08:00", fim: "18:00" },
        ];
      }),
    );
    setForm({
      ativo: settings.ativo,
      slug: settings.slug,
      duracao_min: settings.duracao_min,
      antecedencia_horas: settings.antecedencia_horas,
      janela_dias: settings.janela_dias,
      dias,
    });
  }, [data.data, form]);

  const salvar = useMutation({
    mutationFn: async (f: BookingForm) => {
      if (!isValidSlug(f.slug)) {
        throw new Error("O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífens (ex.: felipe-fisio).");
      }
      const dias = WEEKDAYS.filter(({ weekday }) => f.dias[weekday].on);
      if (dias.length === 0) throw new Error("Marque pelo menos um dia de atendimento.");
      for (const { weekday, label } of dias) {
        const d = f.dias[weekday];
        if (!d.inicio || !d.fim || d.fim <= d.inicio) {
          throw new Error(`Confira o horário de ${label}: o fim precisa ser depois do início.`);
        }
      }
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Sem sessão");

      const { error } = await supabase.from("booking_settings").upsert({
        user_id,
        ativo: f.ativo,
        slug: f.slug,
        duracao_min: f.duracao_min,
        antecedencia_horas: f.antecedencia_horas,
        janela_dias: f.janela_dias,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Esse endereço já está em uso. Escolha outro.");
        throw error;
      }
      const del = await supabase.from("booking_hours").delete().eq("user_id", user_id);
      if (del.error) throw del.error;
      const ins = await supabase
        .from("booking_hours")
        .insert(dias.map(({ weekday }) => ({ user_id, weekday, inicio: f.dias[weekday].inicio, fim: f.dias[weekday].fim })));
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success("Agendamento online salvo");
      qc.invalidateQueries({ queryKey: ["booking-settings"] });
      qc.invalidateQueries({ queryKey: ["booking-slug"] });
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro ao salvar"),
  });

  if (!form) return null;
  const saved = data.data?.settings;
  const pageUrl = saved ? `${window.location.origin}/agendar/${saved.slug}` : null;
  const setDia = (weekday: number, patch: Partial<DayHours>) =>
    setForm({ ...form, dias: { ...form.dias, [weekday]: { ...form.dias[weekday], ...patch } } });

  const copiar = async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-serif font-semibold">Agendamento online</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Uma página com seus horários livres para os pacientes pedirem um horário. Cada pedido chega na Agenda para você
        aceitar ou recusar. Coloque o link na bio do Instagram ou mande pelo WhatsApp.
      </p>

      {pageUrl && saved?.ativo && (
        <div className="mb-5 space-y-2">
          <Label htmlFor="booking-page-url">Sua página</Label>
          <div className="flex gap-2">
            <Input id="booking-page-url" readOnly value={pageUrl} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copiar}>
              Copiar
            </Button>
            <Button asChild variant="outline">
              <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                Abrir
              </a>
            </Button>
          </div>
        </div>
      )}

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form);
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="booking-ativo" className="font-normal">
            Página de agendamento ativa
          </Label>
          <Switch id="booking-ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-slug">Endereço da página</Label>
          <div className="flex items-center gap-1 text-sm">
            <span className="shrink-0 text-muted-foreground">fisiogo.online/agendar/</span>
            <Input
              id="booking-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              placeholder="seu-nome"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="booking-duracao">Duração da sessão (min)</Label>
            <Input
              id="booking-duracao"
              type="number"
              min={15}
              max={240}
              step={5}
              value={form.duracao_min}
              onChange={(e) => setForm({ ...form, duracao_min: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Antecedência mínima</Label>
            <Select
              value={String(form.antecedencia_horas)}
              onValueChange={(v) => setForm({ ...form, antecedencia_horas: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 6, 12, 24, 48].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h < 24 ? `${h} horas` : h === 24 ? "1 dia" : `${h / 24} dias`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mostrar horários até</Label>
            <Select value={String(form.janela_dias)} onValueChange={(v) => setForm({ ...form, janela_dias: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 14, 21, 30, 60].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} dias à frente
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Horários de atendimento</Label>
          <div className="divide-y divide-border rounded-lg border border-border">
            {WEEKDAYS.map(({ weekday, label }) => {
              const d = form.dias[weekday];
              return (
                <div key={weekday} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <label className="flex w-28 items-center gap-2 text-sm">
                    <Checkbox
                      id={`booking-dia-${weekday}`}
                      checked={d.on}
                      onCheckedChange={(v) => setDia(weekday, { on: v === true })}
                    />
                    {label}
                  </label>
                  {d.on ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Input
                        id={`booking-inicio-${weekday}`}
                        type="time"
                        className="w-28"
                        value={d.inicio}
                        onChange={(e) => setDia(weekday, { inicio: e.target.value })}
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        id={`booking-fim-${weekday}`}
                        type="time"
                        className="w-28"
                        value={d.fim}
                        onChange={(e) => setDia(weekday, { fim: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Não atende</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Horários no fuso de Brasília. Horários que já têm sessão ou pedido não aparecem para o paciente.
          </p>
        </div>

        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : saved ? "Salvar agendamento online" : "Criar minha página de agendamento"}
        </Button>
      </form>
    </div>
  );
}
