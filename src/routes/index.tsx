import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FisioFlow — Gestão simples para fisioterapeutas autônomos" },
      {
        name: "description",
        content:
          "Cadastre pacientes, organize a agenda e acompanhe a evolução clínica. Chega de papel, planilhas e WhatsApp.",
      },
      { property: "og:title", content: "FisioFlow — Gestão simples para fisioterapeutas autônomos" },
      {
        property: "og:description",
        content:
          "Cadastre pacientes, organize a agenda e acompanhe a evolução clínica. Chega de papel, planilhas e WhatsApp.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSigned(!!data.session);
      if (data.session) navigate({ to: "/app" });
    });

    // O login com Google redireciona de volta pra essa página (não direto pro
    // /app), e a troca do código OAuth por sessão é assíncrona — pode não ter
    // terminado no getSession() acima. Sem esse listener, a página ficava
    // "presa" mostrando os botões de login até o usuário recarregar.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSigned(!!session);
      if (event === "SIGNED_IN") navigate({ to: "/app" });
    });
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">FisioFlow</span>
          </Link>
          <nav className="flex items-center gap-2">
            {signed ? (
              <Button onClick={() => navigate({ to: "/app" })}>Ir para o app</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate({ to: "/auth" })}>Entrar</Button>
                <Button onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as never })}>
                  Começar grátis
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Para fisioterapeutas autônomos
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Menos papel, planilha e WhatsApp.
            <br />
            <span className="text-primary">Mais tempo com o paciente.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            FisioFlow organiza pacientes, agenda e evolução clínica em um só lugar.
            Simples como uma anotação — confiável como um prontuário.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate({ to: "/auth" })}>
              Começar grátis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ to: "/auth" })}>
              Já tenho conta
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Users, title: "Pacientes organizados", desc: "Dados de contato, cuidadores e familiares em um único lugar." },
              { icon: Calendar, title: "Agenda clara", desc: "Sessões, status e histórico sem confusão." },
              { icon: ClipboardList, title: "Evolução clínica", desc: "Anote a cada sessão. Consulte o histórico em segundos." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Seus dados são seus. Isolados por conta.
          </div>
          <span>© {new Date().getFullYear()} FisioFlow</span>
        </div>
      </footer>
    </div>
  );
}
