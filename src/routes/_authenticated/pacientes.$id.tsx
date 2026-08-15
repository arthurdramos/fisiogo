import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, CalendarPlus, Download, Pencil, Plus, Share2, Trash2, Phone, Mail } from "lucide-react";
import { addMonths, calcAge, formatCurrency, formatDate, formatDateTime, startOfMonth, toDatetimeLocalValue } from "@/lib/format";
import { calcularSaldo, markSessionRealizada, sessionColorClass, sessionStatusLabel } from "@/lib/session-status";
import { downloadBlob, generateBillingReportPdf, shareOrDownloadBlob } from "@/lib/billing-report";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  head: () => ({ meta: [{ title: "Paciente — FisioGO" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const patient = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const contacts = useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_contacts")
        .select("*")
        .eq("patient_id", id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const sessions = useQuery({
    queryKey: ["patient-sessions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("patient_id", id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plan = useQuery({
    queryKey: ["plan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*, treatment_exercises(*)")
        .eq("patient_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const deletePatient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente removido");
      qc.invalidateQueries({ queryKey: ["patients"] });
      window.location.href = "/pacientes";
    },
  });

  const updatePatient = useMutation({
    mutationFn: async (values: {
      nome: string;
      telefone: string;
      email: string;
      data_nascimento: string;
      observacoes: string;
      valor_sessao: string;
      custo_sessao: string;
      ap_historico: string;
      queixa_principal: string;
    }) => {
      const { error } = await supabase
        .from("patients")
        .update({
          nome: values.nome,
          telefone: values.telefone || null,
          email: values.email || null,
          data_nascimento: values.data_nascimento || null,
          observacoes: values.observacoes || null,
          valor_sessao: values.valor_sessao ? Number(values.valor_sessao) : null,
          custo_sessao: values.custo_sessao ? Number(values.custo_sessao) : null,
          ap_historico: values.ap_historico || null,
          queixa_principal: values.queixa_principal || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      setEditOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const scheduleSession = useMutation({
    mutationFn: async (values: { scheduled_at: string; duration_min: number }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Sem sessão");
      const { error } = await supabase.from("sessions").insert({
        user_id,
        patient_id: id,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        duration_min: values.duration_min,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sessão agendada");
      qc.invalidateQueries({ queryKey: ["patient-sessions", id] });
      qc.invalidateQueries({ queryKey: ["agenda-sessions"] });
      qc.invalidateQueries({ queryKey: ["upcoming-sessions"] });
      setScheduleOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (patient.isLoading) return <div className="p-10 text-sm text-muted-foreground">Carregando...</div>;
  if (!patient.data) return <div className="p-10 text-sm">Paciente não encontrado.</div>;

  const p = patient.data;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <Link to="/pacientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{p.nome}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {p.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.telefone}</span>}
            {p.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{p.email}</span>}
            {p.data_nascimento && (
              <span>
                Nasc: {new Date(p.data_nascimento).toLocaleDateString("pt-BR")} ({calcAge(p.data_nascimento)} anos)
              </span>
            )}
            {p.valor_sessao != null && <span>Valor por sessão: {formatCurrency(Number(p.valor_sessao))}</span>}
            {p.custo_sessao != null && <span>Custo por sessão: {formatCurrency(Number(p.custo_sessao))}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CalendarPlus className="mr-1 h-4 w-4" /> Agendar sessão
              </Button>
            </DialogTrigger>
            <ScheduleSessionDialog
              patientName={p.nome}
              onSubmit={scheduleSession.mutate}
              loading={scheduleSession.isPending}
            />
          </Dialog>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" /> Editar
              </Button>
            </DialogTrigger>
            <PatientEditDialog patient={p} onSubmit={updatePatient.mutate} loading={updatePatient.isPending} />
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Remover este paciente? Isso apaga sessões e plano vinculados.")) deletePatient.mutate();
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      {(p.ap_historico || p.queixa_principal || p.observacoes) && (
        <div className="mb-6 space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
          {p.ap_historico && (
            <p>
              <span className="font-medium">AP/Histórico: </span>
              <span className="text-muted-foreground">{p.ap_historico}</span>
            </p>
          )}
          {p.queixa_principal && (
            <p>
              <span className="font-medium">Queixa principal: </span>
              <span className="text-muted-foreground">{p.queixa_principal}</span>
            </p>
          )}
          {p.observacoes && <p className="text-muted-foreground">{p.observacoes}</p>}
        </div>
      )}

      <SaldoSection patientId={id} />

      <Tabs defaultValue="sessoes">
        <TabsList>
          <TabsTrigger value="sessoes">Sessões</TabsTrigger>
          <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
          <TabsTrigger value="plano">Plano de tratamento</TabsTrigger>
          <TabsTrigger value="contatos">Contatos secundários</TabsTrigger>
        </TabsList>

        <TabsContent value="sessoes" className="mt-4">
          <SessionsSection patientId={id} sessions={sessions.data ?? []} />
        </TabsContent>

        <TabsContent value="cobranca" className="mt-4">
          <BillingSection patientId={id} patient={p} plan={plan.data ?? null} sessions={sessions.data ?? []} />
        </TabsContent>

        <TabsContent value="plano" className="mt-4">
          <PlanSection patientId={id} plan={plan.data} />
        </TabsContent>

        <TabsContent value="contatos" className="mt-4">
          <ContactsSection patientId={id} contacts={contacts.data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PatientEditDialog({
  patient,
  onSubmit,
  loading,
}: {
  patient: {
    nome: string;
    telefone: string | null;
    email: string | null;
    data_nascimento: string | null;
    observacoes: string | null;
    valor_sessao: number | null;
    custo_sessao: number | null;
    ap_historico: string | null;
    queixa_principal: string | null;
  };
  onSubmit: (v: {
    nome: string;
    telefone: string;
    email: string;
    data_nascimento: string;
    observacoes: string;
    valor_sessao: string;
    custo_sessao: string;
    ap_historico: string;
    queixa_principal: string;
  }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    nome: patient.nome,
    telefone: patient.telefone ?? "",
    email: patient.email ?? "",
    data_nascimento: patient.data_nascimento ?? "",
    observacoes: patient.observacoes ?? "",
    valor_sessao: patient.valor_sessao != null ? String(patient.valor_sessao) : "",
    custo_sessao: patient.custo_sessao != null ? String(patient.custo_sessao) : "",
    ap_historico: patient.ap_historico ?? "",
    queixa_principal: patient.queixa_principal ?? "",
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar paciente</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nome.trim()) return;
          onSubmit(form);
        }}
      >
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>AP / Histórico</Label>
          <Textarea
            rows={2}
            value={form.ap_historico}
            onChange={(e) => setForm({ ...form, ap_historico: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Queixa principal</Label>
          <Textarea
            rows={2}
            value={form.queixa_principal}
            onChange={(e) => setForm({ ...form, queixa_principal: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Valor por sessão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.valor_sessao}
              onChange={(e) => setForm({ ...form, valor_sessao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Custo por sessão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="Uber, material..."
              value={form.custo_sessao}
              onChange={(e) => setForm({ ...form, custo_sessao: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ScheduleSessionDialog({
  patientName,
  onSubmit,
  loading,
}: {
  patientName: string;
  onSubmit: (v: { scheduled_at: string; duration_min: number }) => void;
  loading: boolean;
}) {
  const [scheduled_at, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toDatetimeLocalValue(d);
  });
  const [duration_min, setDuration] = useState(50);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Agendar sessão para {patientName}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ scheduled_at, duration_min });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Data e hora *</Label>
            <Input type="datetime-local" value={scheduled_at} onChange={(e) => setWhen(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input type="number" min={10} step={5} value={duration_min} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Agendando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ================== Sessions & Evolução ==================

function SessionsSection({
  patientId,
  sessions,
}: {
  patientId: string;
  sessions: Array<{
    id: string;
    scheduled_at: string;
    duration_min: number;
    status: string;
    notes_evolucao: string | null;
    pago: boolean;
    valor_cobrado: number | null;
  }>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["patient-sessions", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-payments", patientId] });
    qc.invalidateQueries({ queryKey: ["patient-credited-sessions", patientId] });
  };

  const saveNotes = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("sessions").update({ notes_evolucao: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evolução salva");
      qc.invalidateQueries({ queryKey: ["patient-sessions", patientId] });
      setEditing(null);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status !== "realizada") {
        const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
        if (error) throw error;
        return;
      }
      await markSessionRealizada(id, patientId);
    },
    onSuccess: invalidateAll,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sessions")
        .update({ pago: true, pago_via: "avulso", pago_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sessão marcada como paga");
      invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (sessions.length === 0)
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhuma sessão registrada. Agende pela <Link to="/agenda" className="text-primary hover:underline">Agenda</Link>.
      </div>
    );

  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{formatDateTime(s.scheduled_at)}</p>
              <p className="text-xs text-muted-foreground">
                {s.duration_min} min
                {s.valor_cobrado != null && <> · {formatCurrency(Number(s.valor_cobrado))}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={"rounded-md px-2 py-1 text-xs " + sessionColorClass(s)}>
                {sessionStatusLabel(s)}
              </span>
              {s.status === "realizada" && !s.pago && (
                <Button size="sm" variant="outline" onClick={() => markPaid.mutate(s.id)} disabled={markPaid.isPending}>
                  Marcar como pago
                </Button>
              )}
              <select
                value={s.status}
                onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            {editing === s.id ? (
              <div className="space-y-2">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Evolução clínica..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveNotes.mutate({ id: s.id, value: notes })}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </div>
            ) : s.notes_evolucao ? (
              <div>
                <p className="whitespace-pre-wrap text-sm">{s.notes_evolucao}</p>
                <button
                  onClick={() => { setEditing(s.id); setNotes(s.notes_evolucao ?? ""); }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Editar evolução
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditing(s.id); setNotes(""); }}
                className="text-xs text-primary hover:underline"
              >
                + Adicionar evolução
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ================== Saldo / carteira ==================

function SaldoSection({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const payments = useQuery({
    queryKey: ["patient-payments", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_payments")
        .select("*")
        .eq("patient_id", patientId)
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const creditedSessions = useQuery({
    queryKey: ["patient-credited-sessions", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("valor_cobrado")
        .eq("patient_id", patientId)
        .eq("pago_via", "credito");
      if (error) throw error;
      return data ?? [];
    },
  });

  const saldo = calcularSaldo(payments.data ?? [], creditedSessions.data ?? []);

  const addPayment = useMutation({
    mutationFn: async (v: { valor: string; data: string; observacao: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      const { error } = await supabase.from("patient_payments").insert({
        patient_id: patientId,
        user_id,
        valor: Number(v.valor),
        data: v.data,
        observacao: v.observacao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Depósito registrado");
      qc.invalidateQueries({ queryKey: ["patient-payments", patientId] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Saldo do paciente</p>
          <p className={"font-display text-2xl font-semibold " + (saldo < 0 ? "text-destructive" : "")}>
            {formatCurrency(saldo)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Registrar depósito</Button>
          </DialogTrigger>
          <PaymentDialog onSubmit={addPayment.mutate} loading={addPayment.isPending} />
        </Dialog>
      </div>
      {payments.data && payments.data.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-t border-border pt-2">
          {payments.data.map((pay) => (
            <li key={pay.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p>{formatDate(pay.data)}</p>
                {pay.observacao && <p className="text-xs text-muted-foreground">{pay.observacao}</p>}
              </div>
              <span className="font-medium">{formatCurrency(Number(pay.valor))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (v: { valor: string; data: string; observacao: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    observacao: "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar depósito</DialogTitle></DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.valor) return;
          onSubmit(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ================== Cobrança / Relatórios ==================

type BillableSession = {
  id: string;
  scheduled_at: string;
  status: string;
  pago: boolean;
  valor_cobrado: number | null;
  notes_evolucao: string | null;
};

type BillingPatientInfo = {
  nome: string;
  data_nascimento: string | null;
  ap_historico: string | null;
  queixa_principal: string | null;
  template_estado_geral: string | null;
  template_sinais_vitais: string | null;
  template_atendimentos_realizados: string | null;
  template_observacoes_evolucoes: string | null;
};

type BillingPlanInfo = {
  objetivos: string | null;
  treatment_exercises?: Array<{ nome: string; series_reps: string | null; observacao: string | null }>;
} | null;

function BillingSection({
  patientId,
  patient,
  plan,
  sessions,
}: {
  patientId: string;
  patient: BillingPatientInfo;
  plan: BillingPlanInfo;
  sessions: BillableSession[];
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);

  const unpaid = sessions.filter((s) => s.status === "realizada" && !s.pago);

  const toggle = (sessionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const selectAllOpen = () => setSelected(new Set(unpaid.map((s) => s.id)));

  const selectLastClosedMonth = () => {
    const lastMonthStart = addMonths(startOfMonth(new Date()), -1);
    const ids = unpaid
      .filter((s) => startOfMonth(new Date(s.scheduled_at)).getTime() === lastMonthStart.getTime())
      .map((s) => s.id);
    setSelected(new Set(ids));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedSessions = unpaid.filter((s) => selected.has(s.id));
  const total = selectedSessions.reduce((acc, s) => acc + Number(s.valor_cobrado ?? 0), 0);

  const reports = useQuery({
    queryKey: ["billing-reports", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_reports")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const profile = useQuery({
    queryKey: ["professional-profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;
      const { data, error } = await supabase
        .from("professional_profile")
        .select("*")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const markPaidBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("sessions")
        .update({ pago: true, pago_via: "avulso", pago_em: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sessões marcadas como pagas");
      clearSelection();
      qc.invalidateQueries({ queryKey: ["patient-sessions", patientId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const downloadPast = async (path: string) => {
    const { data, error } = await supabase.storage.from("billing-reports").download(path);
    if (error || !data) {
      toast.error("Erro ao baixar relatório");
      return;
    }
    downloadBlob(data, `relatorio-${patient.nome}.pdf`);
  };

  const sharePast = async (path: string) => {
    const { data, error } = await supabase.storage.from("billing-reports").download(path);
    if (error || !data) {
      toast.error("Erro ao carregar relatório");
      return;
    }
    await shareOrDownloadBlob(data, `relatorio-${patient.nome}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold">Sessões em aberto</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selectAllOpen} disabled={unpaid.length === 0}>
              Selecionar todas em aberto
            </Button>
            <Button size="sm" variant="outline" onClick={selectLastClosedMonth} disabled={unpaid.length === 0}>
              Selecionar último mês fechado
            </Button>
          </div>
        </div>

        {unpaid.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão em aberto.</p>
        ) : (
          <ul className="divide-y divide-border">
            {unpaid.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {formatDateTime(s.scheduled_at)}
                </label>
                <span className="text-sm font-medium">{formatCurrency(Number(s.valor_cobrado ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}

        {selectedSessions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm">
              {selectedSessions.length} selecionada(s) · Total: <span className="font-semibold">{formatCurrency(total)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => markPaidBulk.mutate(selectedSessions.map((s) => s.id))}
                disabled={markPaidBulk.isPending}
              >
                Marcar selecionadas como pagas
              </Button>
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <Button size="sm" onClick={() => setReportOpen(true)}>
                  Gerar relatório (PDF)
                </Button>
                <ReportOptionsDialog
                  patientId={patientId}
                  patient={patient}
                  plan={plan}
                  sessions={selectedSessions}
                  total={total}
                  profile={profile.data ?? null}
                  onGenerated={() => {
                    setReportOpen(false);
                    clearSelection();
                    qc.invalidateQueries({ queryKey: ["billing-reports", patientId] });
                    qc.invalidateQueries({ queryKey: ["patient-sessions", patientId] });
                  }}
                />
              </Dialog>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-display font-semibold">Relatórios gerados</h3>
          <p className="text-xs text-muted-foreground">Últimos 12 ficam salvos aqui.</p>
        </div>
        <ul className="divide-y divide-border">
          {reports.data?.length === 0 && (
            <li className="p-5 text-sm text-muted-foreground">Nenhum relatório gerado ainda.</li>
          )}
          {reports.data?.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{formatDate(r.created_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {r.session_ids.length} sessão(ões) · {formatCurrency(Number(r.total))}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => downloadPast(r.pdf_path)}>
                  <Download className="mr-1 h-4 w-4" /> Baixar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => sharePast(r.pdf_path)}>
                  <Share2 className="mr-1 h-4 w-4" /> Compartilhar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type ResumoFieldKey = "estado_geral" | "sinais_vitais" | "atendimentos_realizados" | "observacoes_evolucoes";
type TemplateFieldKey =
  | "template_estado_geral"
  | "template_sinais_vitais"
  | "template_atendimentos_realizados"
  | "template_observacoes_evolucoes";

const RESUMO_FIELDS: Array<{ key: ResumoFieldKey; label: string; templateField: TemplateFieldKey }> = [
  { key: "estado_geral", label: "Estado Geral / Cognitivo", templateField: "template_estado_geral" },
  { key: "sinais_vitais", label: "Sinais Vitais", templateField: "template_sinais_vitais" },
  {
    key: "atendimentos_realizados",
    label: "Atendimentos realizados",
    templateField: "template_atendimentos_realizados",
  },
  {
    key: "observacoes_evolucoes",
    label: "Observações e Evoluções",
    templateField: "template_observacoes_evolucoes",
  },
];

function ReportOptionsDialog({
  patientId,
  patient,
  plan,
  sessions,
  total,
  profile,
  onGenerated,
}: {
  patientId: string;
  patient: BillingPatientInfo;
  plan: BillingPlanInfo;
  sessions: BillableSession[];
  total: number;
  profile: {
    nome: string | null;
    crefito: string | null;
    telefone: string | null;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    chave_pix: string | null;
  } | null;
  onGenerated: () => void;
}) {
  const compiledEvolucoes = useMemo(() => {
    const comNotas = sessions.filter((s) => s.notes_evolucao);
    if (comNotas.length === 0) return "";
    return comNotas.map((s) => `${formatDate(s.scheduled_at)}: ${s.notes_evolucao}`).join("\n");
  }, [sessions]);

  const sessionsSemEvolucao = sessions.filter((s) => !s.notes_evolucao);

  const [fields, setFields] = useState<
    Record<ResumoFieldKey, { include: boolean; text: string; saveTemplate: boolean }>
  >({
    estado_geral: { include: false, text: patient.template_estado_geral ?? "", saveTemplate: false },
    sinais_vitais: { include: false, text: patient.template_sinais_vitais ?? "", saveTemplate: false },
    atendimentos_realizados: {
      include: false,
      text: patient.template_atendimentos_realizados ?? "",
      saveTemplate: false,
    },
    observacoes_evolucoes: {
      include: false,
      text: compiledEvolucoes || patient.template_observacoes_evolucoes || "",
      saveTemplate: false,
    },
  });
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});

  const setField = (key: ResumoFieldKey, patch: Partial<{ include: boolean; text: string; saveTemplate: boolean }>) => {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const regenerateDraft = () => {
    const merged = sessions
      .map((s) => {
        const nota = inlineNotes[s.id]?.trim() || s.notes_evolucao;
        return nota ? `${formatDate(s.scheduled_at)}: ${nota}` : null;
      })
      .filter((l): l is string => l != null)
      .join("\n");
    setField("observacoes_evolucoes", { text: merged });
  };

  const generate = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Sem sessão");
      if (sessions.length === 0) throw new Error("Nenhuma sessão selecionada");

      const notasParaSalvar = Object.entries(inlineNotes).filter(([, v]) => v.trim());
      for (const [sessionId, value] of notasParaSalvar) {
        const { error } = await supabase.from("sessions").update({ notes_evolucao: value }).eq("id", sessionId);
        if (error) throw error;
      }

      const templateUpdates: Partial<Record<TemplateFieldKey, string | null>> = {};
      for (const f of RESUMO_FIELDS) {
        const state = fields[f.key];
        if (state.include && state.saveTemplate) {
          templateUpdates[f.templateField] = state.text || null;
        }
      }
      if (Object.keys(templateUpdates).length > 0) {
        const { error } = await supabase.from("patients").update(templateUpdates).eq("id", patientId);
        if (error) throw error;
      }

      const resumoSections = RESUMO_FIELDS.filter((f) => fields[f.key].include && fields[f.key].text.trim()).map(
        (f) => ({ label: f.label, content: fields[f.key].text.trim() }),
      );

      const blob = generateBillingReportPdf({
        patientName: patient.nome,
        patientAge: patient.data_nascimento ? calcAge(patient.data_nascimento) : null,
        apHistorico: patient.ap_historico,
        queixaPrincipal: patient.queixa_principal,
        objetivos: plan?.objetivos ?? null,
        exercicios: (plan?.treatment_exercises ?? []).map((ex) => ({
          nome: ex.nome,
          series_reps: ex.series_reps,
          observacao: ex.observacao,
        })),
        resumoSections,
        sessions,
        total,
        profissional: profile,
      });

      const path = `${user_id}/${patientId}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage.from("billing-reports").upload(path, blob, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("billing_reports").insert({
        patient_id: patientId,
        user_id,
        session_ids: sessions.map((s) => s.id),
        total,
        pdf_path: path,
      });
      if (insErr) throw insErr;

      const { data: allReports } = await supabase
        .from("billing_reports")
        .select("id, pdf_path")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (allReports && allReports.length > 12) {
        const overflow = allReports.slice(12);
        await supabase.storage.from("billing-reports").remove(overflow.map((r) => r.pdf_path));
        await supabase.from("billing_reports").delete().in("id", overflow.map((r) => r.id));
      }

      return blob;
    },
    onSuccess: (blob) => {
      toast.success("Relatório gerado");
      downloadBlob(blob, `relatorio-${patient.nome}.pdf`);
      onGenerated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Configurar fechamento</DialogTitle>
      </DialogHeader>
      <div className="space-y-5">
        {RESUMO_FIELDS.map((f) => {
          const state = fields[f.key];
          return (
            <div key={f.key} className="rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={state.include}
                  onChange={(e) => setField(f.key, { include: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Incluir "{f.label}"
              </label>
              {state.include && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    rows={3}
                    value={state.text}
                    onChange={(e) => setField(f.key, { text: e.target.value })}
                    placeholder={`Texto de ${f.label.toLowerCase()}...`}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={state.saveTemplate}
                      onChange={(e) => setField(f.key, { saveTemplate: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Salvar este texto como padrão para os próximos fechamentos
                  </label>

                  {f.key === "observacoes_evolucoes" && sessionsSemEvolucao.length > 0 && (
                    <div className="space-y-2 rounded-md border border-dashed border-border p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Sessões sem evolução registrada — preencha se quiser incluir:
                        </p>
                        <Button type="button" size="sm" variant="ghost" onClick={regenerateDraft}>
                          Atualizar rascunho
                        </Button>
                      </div>
                      {sessionsSemEvolucao.map((s) => (
                        <div key={s.id} className="space-y-1">
                          <p className="text-xs font-medium">{formatDate(s.scheduled_at)}</p>
                          <Textarea
                            rows={2}
                            value={inlineNotes[s.id] ?? ""}
                            onChange={(e) => setInlineNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="Evolução desta sessão (opcional)"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-4">
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? "Gerando..." : "Gerar relatório"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ================== Plano de tratamento ==================

function PlanSection({ patientId, plan }: { patientId: string; plan: any }) {
  const qc = useQueryClient();
  const [objetivos, setObjetivos] = useState(plan?.objetivos ?? "");
  const [open, setOpen] = useState(false);

  const savePlan = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      if (plan) {
        const { error } = await supabase.from("treatment_plans").update({ objetivos }).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("treatment_plans").insert({ patient_id: patientId, user_id, objetivos });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plano salvo");
      qc.invalidateQueries({ queryKey: ["plan", patientId] });
    },
  });

  const addExercise = useMutation({
    mutationFn: async (values: { nome: string; series_reps: string; observacao: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      let planId = plan?.id;
      if (!planId) {
        const { data, error } = await supabase
          .from("treatment_plans")
          .insert({ patient_id: patientId, user_id, objetivos })
          .select("id")
          .single();
        if (error) throw error;
        planId = data.id;
      }
      const { error: e2 } = await supabase.from("treatment_exercises").insert({
        plan_id: planId,
        user_id,
        nome: values.nome,
        series_reps: values.series_reps || null,
        observacao: values.observacao || null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Exercício adicionado");
      qc.invalidateQueries({ queryKey: ["plan", patientId] });
      setOpen(false);
    },
  });

  const removeExercise = useMutation({
    mutationFn: async (exId: string) => {
      const { error } = await supabase.from("treatment_exercises").delete().eq("id", exId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", patientId] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <Label>Objetivos do tratamento</Label>
        <Textarea
          className="mt-2"
          rows={4}
          value={objetivos}
          onChange={(e) => setObjetivos(e.target.value)}
          placeholder="Ex: reduzir dor lombar, aumentar amplitude de movimento..."
        />
        <div className="mt-3">
          <Button size="sm" onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>Salvar objetivos</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-display font-semibold">Exercícios prescritos</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
            </DialogTrigger>
            <ExerciseDialog onSubmit={addExercise.mutate} loading={addExercise.isPending} />
          </Dialog>
        </div>
        <ul className="divide-y divide-border">
          {(!plan?.treatment_exercises || plan.treatment_exercises.length === 0) && (
            <li className="p-5 text-sm text-muted-foreground">Sem exercícios ainda.</li>
          )}
          {plan?.treatment_exercises?.map((ex: any) => (
            <li key={ex.id} className="flex items-start justify-between px-5 py-4">
              <div>
                <p className="font-medium">{ex.nome}</p>
                {ex.series_reps && <p className="text-xs text-muted-foreground">{ex.series_reps}</p>}
                {ex.observacao && <p className="mt-1 text-sm text-muted-foreground">{ex.observacao}</p>}
              </div>
              <button onClick={() => removeExercise.mutate(ex.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ExerciseDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (v: { nome: string; series_reps: string; observacao: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ nome: "", series_reps: "", observacao: "" });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo exercício</DialogTitle></DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nome.trim()) return;
          onSubmit(form);
        }}
      >
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Séries × repetições</Label>
          <Input placeholder="3 × 12" value={form.series_reps} onChange={(e) => setForm({ ...form, series_reps: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>Adicionar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ================== Contatos secundários ==================

function ContactsSection({
  patientId,
  contacts,
}: {
  patientId: string;
  contacts: Array<{ id: string; nome: string; relacao: string | null; telefone: string | null }>;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const add = useMutation({
    mutationFn: async (v: { nome: string; relacao: string; telefone: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      const { error } = await supabase.from("patient_contacts").insert({
        patient_id: patientId,
        user_id,
        nome: v.nome,
        relacao: v.relacao || null,
        telefone: v.telefone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato adicionado");
      qc.invalidateQueries({ queryKey: ["contacts", patientId] });
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", patientId] }),
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="font-display font-semibold">Contatos secundários</h3>
          <p className="text-xs text-muted-foreground">Familiares, cuidadores ou responsáveis pela gestão.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
          </DialogTrigger>
          <ContactDialog onSubmit={add.mutate} loading={add.isPending} />
        </Dialog>
      </div>
      <ul className="divide-y divide-border">
        {contacts.length === 0 && <li className="p-5 text-sm text-muted-foreground">Nenhum contato adicionado.</li>}
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium">{c.nome}</p>
              <p className="text-xs text-muted-foreground">
                {c.relacao && <span>{c.relacao}</span>}
                {c.relacao && c.telefone && <span> · </span>}
                {c.telefone && <span>{c.telefone}</span>}
              </p>
            </div>
            <button onClick={() => remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (v: { nome: string; relacao: string; telefone: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ nome: "", relacao: "", telefone: "" });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo contato secundário</DialogTitle></DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nome.trim()) return;
          onSubmit(form);
        }}
      >
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Relação</Label>
          <Input placeholder="Ex: mãe, cuidadora, irmão..." value={form.relacao} onChange={(e) => setForm({ ...form, relacao: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>Adicionar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
