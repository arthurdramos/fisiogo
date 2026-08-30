import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCPF } from "@/lib/format";
import { extractErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/completar-perfil")({
  head: () => ({ meta: [{ title: "Completar cadastro — FisioGO" }] }),
  component: CompletarPerfil,
});

function CompletarPerfil() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", cpf: "", crefito: "", telefone: "" });
  const [lgpdAceite, setLgpdAceite] = useState(false);
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
      });
      setLgpdAceite(!!profile.data.lgpd_aceite_em);
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
        nome: form.nome,
        cpf: form.cpf || null,
        crefito: form.crefito,
        telefone: form.telefone,
        lgpd_aceite_em: profile.data?.lgpd_aceite_em ?? new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Cadastro completo!");
      await qc.invalidateQueries({ queryKey: ["professional-profile"] });
      navigate({ to: "/app" });
    },
    onError: (e) => toast.error(extractErrorMessage(e) ?? "Erro ao salvar"),
  });

  return (
    <div className="mx-auto max-w-lg p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold">Complete seu cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faltam alguns dados obrigatórios para liberar o acesso ao FisioGO.
        </p>
      </div>

      <form
        className="space-y-5 rounded-xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nome.trim() || !form.crefito.trim() || !form.telefone.trim()) {
            toast.error("Preencha nome, CREFITO e telefone.");
            return;
          }
          if (!lgpdAceite) {
            toast.error("É preciso aceitar os termos e a política de privacidade (LGPD).");
            return;
          }
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={form.cpf}
            placeholder="000.000.000-00"
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crefito">CREFITO</Label>
          <Input
            id="crefito"
            value={form.crefito}
            onChange={(e) => setForm({ ...form, crefito: e.target.value })}
            placeholder="Ex: 123456-F"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            type="tel"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(11) 91234-5678"
            required
          />
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="lgpd"
            checked={lgpdAceite}
            onCheckedChange={(checked) => setLgpdAceite(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="lgpd" className="text-sm font-normal leading-snug text-muted-foreground">
            Li e aceito os termos de uso e a política de privacidade, e concordo com o tratamento
            dos meus dados conforme a LGPD.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </div>
  );
}
