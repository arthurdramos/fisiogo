import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatCPF, initials } from "@/lib/format";
import { extractErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  head: () => ({ meta: [{ title: "Pacientes — FisioGO" }] }),
  component: PatientsList,
});

function PatientsList() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const patients = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, nome, telefone, email, data_nascimento")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (values: {
      nome: string;
      cpf: string;
      telefone: string;
      email: string;
      data_nascimento: string;
      observacoes: string;
      valor_sessao: string;
      custo_sessao: string;
      ap_historico: string;
      queixa_principal: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Sem sessão");
      const { error } = await supabase.from("patients").insert({
        user_id,
        nome: values.nome,
        cpf: values.cpf || null,
        telefone: values.telefone || null,
        email: values.email || null,
        data_nascimento: values.data_nascimento || null,
        observacoes: values.observacoes || null,
        valor_sessao: values.valor_sessao ? Number(values.valor_sessao) : null,
        custo_sessao: values.custo_sessao ? Number(values.custo_sessao) : null,
        ap_historico: values.ap_historico || null,
        queixa_principal: values.queixa_principal || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient-count"] });
      setOpen(false);
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro"),
  });

  const filtered = patients.data?.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patients.data?.length ?? 0} pacientes cadastrados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Novo paciente</Button>
          </DialogTrigger>
          <PatientDialog onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {patients.isLoading && <li className="p-5 text-sm text-muted-foreground">Carregando...</li>}
          {filtered?.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              Nenhum paciente ainda. Clique em "Novo paciente" para começar.
            </li>
          )}
          {filtered?.map((p) => (
            <li key={p.id}>
              <Link
                to="/pacientes/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {initials(p.nome)}
                  </div>
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {p.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefone}</span>}
                      {p.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-primary">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PatientDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (v: {
    nome: string;
    cpf: string;
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
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    observacoes: "",
    valor_sessao: "",
    custo_sessao: "",
    ap_historico: "",
    queixa_principal: "",
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo paciente</DialogTitle>
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
            <Label>CPF</Label>
            <Input
              value={form.cpf}
              placeholder="000.000.000-00"
              inputMode="numeric"
              onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
            />
          </div>
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
            placeholder="Ex: Demência dos corpos de Lewy"
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
            {loading ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
