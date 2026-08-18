import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  ClipboardList,
  Sparkles,
  Wallet,
  BellRing,
  CheckCircle2,
  HeartPulse,
  Smartphone,
  Clock,
  UserPlus,
  CalendarCheck,
  LineChart,
} from "lucide-react";

const TITLE = "FisioGO — Gestão simples para fisioterapeutas autônomos";
const DESCRIPTION =
  "Pacientes, agenda, evolução clínica e financeiro em um só lugar. Comece grátis em 2 minutos, sem cartão de crédito.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "Cadastro de pacientes",
    desc: "Dados de contato, data de nascimento, observações e valor da sessão — tudo em uma ficha só.",
  },
  {
    icon: HeartPulse,
    title: "Contatos secundários",
    desc: "Familiares e cuidadores vinculados ao paciente, com relação e telefone.",
  },
  {
    icon: Calendar,
    title: "Agenda semanal",
    desc: "Agende sessões com duração e status (agendada, realizada, cancelada) em uma visão clara da semana.",
  },
  {
    icon: ClipboardList,
    title: "Evolução clínica",
    desc: "Uma nota por sessão. O histórico completo do paciente a um clique.",
  },
  {
    icon: CheckCircle2,
    title: "Plano de tratamento",
    desc: "Objetivos e exercícios prescritos, com séries, repetições e observações.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    desc: "Receita por período a partir das sessões realizadas e do valor de cada paciente.",
  },
  {
    icon: BellRing,
    title: "Lembretes de sessão",
    desc: "Avisos automáticos das próximas sessões para reduzir faltas na agenda.",
  },
  {
    icon: Smartphone,
    title: "Confirmação do paciente",
    desc: "Link de confirmação de presença — sem depender de conversas soltas no WhatsApp.",
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "Crie sua conta",
    desc: "Em 2 minutos, sem cartão de crédito. Email e senha ou login com Google.",
  },
  {
    icon: Users,
    title: "Cadastre seus pacientes",
    desc: "Ficha, contatos secundários e plano de tratamento em poucos campos.",
  },
  {
    icon: CalendarCheck,
    title: "Agende suas consultas",
    desc: "Monte a semana, registre a evolução e marque as sessões realizadas.",
  },
  {
    icon: LineChart,
    title: "Veja seus resultados",
    desc: "Acompanhe atendimentos e receita sem abrir uma planilha.",
  },
];

const differentials = [
  {
    title: "Feito para quem atende sozinho",
    desc: "Nada de módulos de clínica grande. Só o que um fisioterapeuta autônomo usa todo dia.",
  },
  {
    title: "Simples como uma anotação",
    desc: "Interface limpa, sem treinamento. Você cadastra o primeiro paciente no primeiro minuto.",
  },
  {
    title: "Clínico e financeiro juntos",
    desc: "A mesma sessão que gera a evolução alimenta o seu faturamento. Sem retrabalho.",
  },
  {
    title: "Seus dados isolados por conta",
    desc: "Cada profissional enxerga apenas os próprios pacientes, com isolamento no banco de dados.",
  },
  {
    title: "Funciona no celular",
    desc: "Atende em domicílio? Consulte a ficha e registre a evolução direto do telefone.",
  },
  {
    title: "Teste sem compromisso",
    desc: "7 dias grátis, sem cartão. Assine só se fizer sentido para a sua rotina.",
  },
];

const faqs = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. A conta começa com 7 dias de teste gratuito e você só informa pagamento se decidir continuar.",
  },
  {
    q: "Serve para atendimento domiciliar?",
    a: "Sim. O FisioGO funciona no navegador do celular, então você consulta e registra tudo no atendimento.",
  },
  {
    q: "Meus pacientes precisam instalar algo?",
    a: "Não. Eles recebem apenas um link de confirmação de sessão quando você quiser.",
  },
  {
    q: "Consigo exportar meus dados?",
    a: "Sim. Seus registros são seus e podem ser exportados quando você quiser.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSigned(!!data.session));
  }, []);

  const goSignup = () => navigate({ to: "/auth", search: { mode: "signup" } as never });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">FisioGO</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#funcionalidades" className="transition-colors hover:text-foreground">Funcionalidades</a>
            <a href="#diferenciais" className="transition-colors hover:text-foreground">Diferenciais</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#faq" className="transition-colors hover:text-foreground">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2">
            {signed ? (
              <Button onClick={() => navigate({ to: "/app" })}>Ir para o app</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate({ to: "/auth" })}>Entrar</Button>
                <Button onClick={goSignup}>Começar grátis</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-[radial-gradient(60%_60%_at_50%_50%,var(--color-primary)_0%,transparent_70%)] opacity-10"
          />
          <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              7 dias grátis · sem cartão de crédito
            </div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Menos papel, planilha e WhatsApp.
              <br />
              <span className="text-primary">Mais tempo com o paciente.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              O FisioGO organiza pacientes, agenda, evolução clínica e financeiro em um só lugar.
              Simples como uma anotação — confiável como um prontuário.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={goSignup}>Criar conta grátis</Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ to: "/auth" })}>
                Já tenho conta
              </Button>
            </div>

            <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { k: "2 min", v: "para começar" },
                { k: "1 tela", v: "para a semana toda" },
                { k: "0", v: "planilhas" },
                { k: "100%", v: "no celular" },
              ].map(({ k, v }) => (
                <div key={v} className="rounded-xl border border-border bg-card px-4 py-5">
                  <dt className="font-display text-2xl font-semibold text-foreground">{k}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="border-b border-border/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Funcionalidades</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Tudo o que a sua rotina precisa. Nada além disso.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Cada recurso existe para tirar uma tarefa manual do seu dia.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section id="diferenciais" className="border-b border-border/60 bg-secondary/40 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Diferenciais</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Por que o FisioGO e não uma planilha?
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Softwares de clínica são pesados demais. Planilhas são frágeis demais.
                  O FisioGO fica exatamente no meio: o suficiente para profissionalizar,
                  leve o bastante para usar entre um atendimento e outro.
                </p>
                <Button className="mt-8" onClick={goSignup}>
                  Experimentar grátis
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {differentials.map(({ title, desc }) => (
                  <div key={title} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <h3 className="font-display text-sm font-semibold">{title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Linha do tempo */}
        <section id="como-funciona" className="border-b border-border/60 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Como funciona</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Comece em poucos passos
              </h2>
              <p className="mt-4 text-muted-foreground">
                Do cadastro ao primeiro resultado financeiro, sem configuração complicada.
              </p>
            </div>

            <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
              <div
                aria-hidden
                className="absolute left-5 top-0 hidden h-full w-px bg-border md:left-0 md:top-5 md:h-px md:w-full md:block"
              />
              {steps.map(({ icon: Icon, title, desc }, i) => (
                <li key={title} className="relative flex gap-4 md:block">
                  <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="md:mt-5">
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Passo {i + 1}
                    </span>
                    <h3 className="mt-1 font-display text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={goSignup}>Criar minha conta</Button>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Leva cerca de 2 minutos
              </span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border/60 bg-secondary/40 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Dúvidas frequentes</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Antes de criar sua conta
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {faqs.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-display text-sm font-semibold">{q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-border bg-card px-8 py-14 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Sua próxima semana pode ser mais leve.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Crie sua conta gratuitamente e organize pacientes, agenda e financeiro hoje mesmo.
              </p>
              <Button size="lg" className="mt-8" onClick={goSignup}>
                Começar grátis
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
          <span className="text-xs text-muted-foreground/80">
            Desenvolvido por Flowvia — FLOWVIA DESENVOLVIMENTO DE SOFTWARE CUSTOMIZAVEL LTDA · CNPJ 68.558.820/0001-37
          </span>
          <span>© {new Date().getFullYear()} FisioGO</span>
        </div>
      </footer>
    </div>
  );
}
