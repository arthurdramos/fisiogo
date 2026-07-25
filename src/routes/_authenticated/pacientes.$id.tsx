import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { ArrowLeft, Pencil, Plus, Trash2, Phone, Mail } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  head: () => ({ meta: [{ title: "Paciente — FisioFlow" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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
            {p.data_nascimento && <span>Nasc: {new Date(p.data_nascimento).toLocaleDateString("pt-BR")}</span>}
            {p.valor_sessao != null && <span>Valor por sessão: {formatCurrency(Number(p.valor_sessao))}</span>}
            {p.custo_sessao != null && <span>Custo por sessão: {formatCurrency(Number(p.custo_sessao))}</span>}
          </div>
        </div>
        <div className="flex gap-2">
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

      {p.observacoes && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {p.observacoes}
        </div>
      )}

      <Tabs defaultValue="sessoes">
        <TabsList>
          <TabsTrigger value="sessoes">Sessões</TabsTrigger>
          <TabsTrigger value="plano">Plano de tratamento</TabsTrigger>
          <TabsTrigger value="contatos">Contatos secundários</TabsTrigger>
        </TabsList>

        <TabsContent value="sessoes" className="mt-4">
          <SessionsSection patientId={id} sessions={sessions.data ?? []} />
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
  };
  onSubmit: (v: {
    nome: string;
    telefone: string;
    email: string;
    data_nascimento: string;
    observacoes: string;
    valor_sessao: string;
    custo_sessao: string;
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
  }>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

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
      const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-sessions", patientId] }),
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
              <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
            </div>
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
