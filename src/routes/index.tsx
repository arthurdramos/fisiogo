import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  ClipboardList,
  Wallet,
  BellRing,
  CheckCircle2,
  HeartPulse,
  Clock,
  UserPlus,
  CalendarCheck,
  LineChart,
  Check,
  Star,
  Plus,
  Compass,
  Share2,
  SquarePlus,
  Smartphone,
  Globe,
  MoreVertical,
  Download,
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
    desc: "Receita controlada por período e dashboard atualizado a partir das sessões realizadas e dos valores de cada paciente. Relatórios de fechamentos e cobrança em 2 cliques.",
  },
  {
    icon: BellRing,
    title: "Lembretes de sessão",
    desc: "Avisos automáticos das próximas sessões para reduzir faltas na agenda.",
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
    title: "Teste sem compromisso",
    desc: "7 dias grátis, sem cartão. Assine só se fizer sentido para a sua rotina.",
  },
  {
    title: "Pensado para o profissional autônomo",
    desc: "Nada de módulos robustos. Só o que um fisioterapeuta autônomo usa no seu dia a dia.",
  },
  {
    title: "Simples como uma anotação",
    desc: "Interface limpa, sem treinamento. Você cadastra o primeiro paciente no primeiro minuto.",
  },
  {
    title: "Clínico e financeiro juntos",
    desc: "A mesma sessão que gera a evolução alimenta o seu faturamento e controla suas cobranças e faz seu relatório. Sem retrabalho.",
  },
  {
    title: "Feito para mobile",
    desc: "Consulte a ficha e registre a evolução direto do telefone, em qualquer atendimento.",
  },
  {
    title: "Seus dados protegidos",
    desc: "Cada profissional enxerga apenas os próprios pacientes, com isolamento no banco de dados.",
  },
];

// TODO: substituir por conteúdo real — depoimentos abaixo são fictícios/placeholder
const testimonials = [
  {
    initials: "CR",
    color: "bg-brand-700",
    quote: "Consegui sair da agenda de papel numa tarde. Hoje fecho o mês sem abrir planilha nenhuma.",
    name: "Camila R.",
    role: "Fisioterapeuta ortopédica · Curitiba/PR",
  },
  {
    initials: "RM",
    color: "bg-accent-600",
    quote: "O que mais uso é a evolução virar cobrança sozinha. Antes eu perdia sessão de vista o tempo todo.",
    name: "Rafael M.",
    role: "Fisioterapeuta domiciliar · Belo Horizonte/MG",
  },
  {
    initials: "JP",
    color: "bg-brand-500",
    quote: "Testei três apps de clínica antes desse. Foi o único que não tentou me vender módulo que eu não uso.",
    name: "Juliana P.",
    role: "Fisioterapeuta autônoma · São Paulo/SP",
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
  {
    q: "Quanto custa depois dos 7 dias de teste?",
    a: "Um valor único por mês, sem taxa de adesão e sem fidelidade. Você só é cobrado se decidir continuar.",
  },
];

const installSteps = [
  {
    platform: "No iPhone",
    badge: "Safari",
    hint: "iPhone e iPad · precisa ser pelo Safari",
    steps: [
      {
        icon: Compass,
        title: "Abra no Safari",
        desc: "Acesse app.fisiogo.com.br pelo Safari (só ele instala no iPhone).",
      },
      {
        icon: Share2,
        title: "Toque em Compartilhar",
        desc: "É o ícone de quadrado com uma seta pra cima, na barra de baixo.",
      },
      {
        icon: SquarePlus,
        title: "Adicionar à Tela de Início",
        desc: "Role a lista e toque nessa opção.",
      },
      {
        icon: Smartphone,
        title: "Toque em Adicionar",
        desc: "Pronto! Abra o FisioGO pelo ícone novo na tela inicial.",
      },
    ],
  },
  {
    platform: "No Android",
    badge: "Chrome",
    hint: "Android · pelo Chrome (ou Edge/Samsung Internet)",
    steps: [
      {
        icon: Globe,
        title: "Abra no Chrome",
        desc: "Acesse app.fisiogo.com.br pelo navegador.",
      },
      {
        icon: MoreVertical,
        title: "Toque no menu (⋮)",
        desc: "São os três pontinhos no canto superior direito.",
      },
      {
        icon: Download,
        title: "Adicionar à tela inicial",
        desc: "Toque em \"Adicionar à tela inicial\" (o nome exato pode variar um pouco conforme a versão do Chrome).",
      },
      {
        icon: Smartphone,
        title: "Confirme e abra pelo ícone",
        desc: "Toque em \"Adicionar\". O atalho aparece na sua tela inicial.",
      },
    ],
  },
];

function Landing() {
  const navigate = useNavigate();
  const [signed, setSigned] = useState(false);
  const [checkingOAuthReturn, setCheckingOAuthReturn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    // O login com Google redireciona de volta pra essa página com os tokens
    // na hash da URL (#access_token=...), não direto pro /app. Enquanto isso
    // não processa, escondemos o conteúdo de marketing por trás de um
    // spinner — sem isso, a página mostrava os botões de login por alguns
    // segundos com o token exposto na barra de endereço antes de entrar.
    const hasAuthHash = window.location.hash.includes("access_token");
    if (hasAuthHash) {
      setCheckingOAuthReturn(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    supabase.auth.getSession().then(({ data }) => {
      setSigned(!!data.session);
      if (data.session) navigate({ to: "/app" });
    });

    // A troca do token pela sessão é assíncrona — pode não ter terminado no
    // getSession() acima. Sem esse listener, a página ficava "presa"
    // mostrando os botões de login até o usuário recarregar. Não zeramos
    // checkingOAuthReturn em nenhum evento aqui (o Supabase dispara um
    // INITIAL_SESSION logo ao assinar, antes até da troca terminar) — só o
    // SIGNED_IN (navega) ou o timeout de segurança abaixo encerram o spinner.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSigned(!!session);
      if (event === "SIGNED_IN") navigate({ to: "/app" });
    });

    // Se algo der errado na troca (token inválido/expirado), não deixa o
    // spinner girando pra sempre — volta a mostrar a página normal.
    const fallback = hasAuthHash ? setTimeout(() => setCheckingOAuthReturn(false), 6000) : undefined;

    return () => {
      authListener.subscription.unsubscribe();
      if (fallback) clearTimeout(fallback);
    };
  }, [navigate]);

  const goSignup = () => navigate({ to: "/auth", search: { mode: "signup" } as never });

  if (checkingOAuthReturn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center">
            <img src="/logo-fisiogo-transparente.png" alt="FisioGO" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#funcionalidades" className="transition-colors hover:text-foreground">Funcionalidades</a>
            <a href="#diferenciais" className="transition-colors hover:text-foreground">Diferenciais</a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#depoimentos" className="transition-colors hover:text-foreground">Depoimentos</a>
            <a href="#precos" className="transition-colors hover:text-foreground">Preços</a>
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
        <section className="relative overflow-hidden border-b border-border/60 pt-20 pb-24">
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                7 dias grátis · sem cartão de crédito
              </div>
              <h1 className="mt-6 font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                Menos papel, planilha e WhatsApp.
                <br />
                <span className="text-primary">Mais tempo com o paciente.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                O FisioGO organiza pacientes, agenda, evolução clínica e financeiro em um só lugar.
                Simples como uma anotação — confiável como um prontuário.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={goSignup}>Criar conta grátis</Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ to: "/auth" })}>
                  Já tenho conta
                </Button>
              </div>
            </div>

            {/* Ilustração: leque de 3 cards (Agenda, Relatório, Financeiro) */}
            <div className="relative mx-auto aspect-[6/5] w-full max-w-[520px] px-3 py-6 sm:px-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(60%_60%_at_60%_30%,var(--brand-100),transparent_70%)]"
              />

              {/* Agenda */}
              <div className="absolute left-0 top-[14%] z-10 w-[40%] -rotate-[8deg] rounded-2xl border border-line bg-paper p-3.5 shadow-[0_20px_40px_-20px_rgba(14,31,82,.35)]">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-lp-accent">Agenda</p>
                <p className="mt-0.5 text-[14px] font-extrabold text-ink">Semana</p>
                <div className="mt-3 grid grid-cols-5 gap-1">
                  {["SEG", "TER", "QUA", "QUI", "SEX"].map((d, i) => (
                    <div key={d}>
                      <div className="mb-1 text-center font-mono text-[7.5px] text-lp-muted">{d}</div>
                      <div className={"h-[18px] rounded " + (i === 2 ? "bg-brand-700" : "bg-canvas")} />
                    </div>
                  ))}
                </div>
                <ul className="mt-2.5 space-y-1">
                  {[
                    { nome: "Ana T.", hora: "08:00" },
                    { nome: "Carlos M.", hora: "09:30" },
                    { nome: "Diego R.", hora: "11:15" },
                    { nome: "Beatriz L.", hora: "14:00", sel: true },
                    { nome: "Fernanda M.", hora: "15:30" },
                  ].map((s) => (
                    <li
                      key={s.nome}
                      className={
                        "flex items-center justify-between rounded-md px-1.5 py-1 text-[9.5px] " +
                        (s.sel ? "bg-brand-100 font-bold text-brand-700" : "text-ink")
                      }
                    >
                      <span>{s.nome}</span>
                      <span className="font-mono text-lp-muted">{s.hora}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Relatório */}
              <div className="absolute left-[30%] top-[6%] z-30 w-[42%] -rotate-[1deg] rounded-2xl border border-line bg-paper p-3.5 shadow-[0_28px_56px_-24px_rgba(14,31,82,.4)]">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-lp-accent">Relatório</p>
                <p className="mt-0.5 text-[12.5px] font-extrabold text-ink">
                  Beatriz L. <span className="font-normal text-lp-muted">· 64 anos</span>
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-1 border-y border-line py-2 text-center">
                  {[
                    ["2", "sessões"],
                    ["18d", "período"],
                    ["03–20", "ago"],
                  ].map(([v, l]) => (
                    <div key={l}>
                      <div className="font-mono text-[11px] font-bold text-ink">{v}</div>
                      <div className="text-[7.5px] text-lp-muted">{l}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[9.5px] leading-snug text-ink">
                  <span className="font-bold">Objetivo:</span> Aprimorar capacidade motora
                </p>
                <p className="mt-1 text-[9.5px] leading-snug text-ink">
                  <span className="font-bold">Evolução:</span> Atividade de subir e descer escada sem auxílio.
                </p>
                <ul className="mt-2 space-y-1 border-t border-line pt-1.5 text-[9.5px]">
                  <li className="flex justify-between">
                    <span className="text-lp-muted">20 de ago.</span>
                    <span className="font-mono text-ink">R$ 250</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-lp-muted">03 de ago.</span>
                    <span className="font-mono text-ink">R$ 250</span>
                  </li>
                </ul>
                <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-[10px] font-bold text-ink">
                  <span>Total</span>
                  <span className="font-mono">R$ 500</span>
                </div>
                <p className="mt-1 text-[8.5px] text-lp-muted">Chave Pix XXXXXXXXX</p>
              </div>

              {/* Financeiro */}
              <div className="absolute left-[68%] top-0 z-20 w-[32%] rotate-[7deg] rounded-2xl border border-line bg-paper p-3.5 shadow-[0_20px_40px_-20px_rgba(14,31,82,.35)]">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-lp-accent">Financeiro</p>
                <p className="mt-0.5 text-[14px] font-extrabold text-ink">Agosto</p>
                <div className="mt-2.5 rounded-xl bg-canvas p-2.5">
                  <p className="text-[8.5px] text-lp-muted">À receber</p>
                  <p className="font-mono text-[15px] font-bold text-amber-600">R$ 1.800</p>
                  <p className="text-[7.5px] text-lp-muted">Confirmadas, ainda não pagas</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {[
                    { l: "Faturado", v: "R$ 5.750", pct: "↑400%", up: true },
                    { l: "Lucro", v: "R$ 4.900", pct: "↑446%", up: true },
                    { l: "Despesas", v: "R$ 850", pct: "↓100%", up: false },
                    { l: "Atend.", v: "23", pct: "↑200%", up: true },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg border border-line p-1.5">
                      <p className="text-[7.5px] text-lp-muted">{s.l}</p>
                      <p className="font-mono text-[10.5px] font-bold text-ink">{s.v}</p>
                      <p className={"text-[7.5px] font-medium " + (s.up ? "text-emerald-600" : "text-red-500")}>
                        {s.pct}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Números rápidos */}
        <div className="bg-brand-900 py-[52px]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-6 sm:grid-cols-4">
            {[
              {
                num: "2 min",
                lab: "para começar",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--lp-accent)" strokeWidth={1.7}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                num: "1 tela",
                lab: "para a semana toda",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--lp-accent)" strokeWidth={1.7}>
                    <rect x="3" y="4" width="18" height="13" rx="1.5" />
                    <path d="M9 20h6M12 17v3" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: "0",
                lab: "planilhas",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--lp-accent)" strokeWidth={1.3}>
                    <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
                    <path d="M3.5 9.5h17M3.5 14.5h17M9 4v16M15 4v16" />
                    <path d="M2.5 2.5l19 19" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: "100%",
                lab: "no celular",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--lp-accent)" strokeWidth={1.7}>
                    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
                    <path d="M11 19h2" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div
                key={s.lab}
                className={
                  "px-3 text-center " +
                  (i === 0 || i === 2 ? "border-l-0 " : "border-l border-white/[.14] ") +
                  (i === 0 ? "sm:border-l-0" : "sm:border-l sm:border-white/[.14]")
                }
              >
                <div className="mx-auto mb-3.5 h-[26px] w-[26px]">{s.icon}</div>
                <div className="font-mono text-3xl font-semibold text-white">{s.num}</div>
                <div className="mt-1 text-[13px] text-white/65">{s.lab}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Linha do tempo */}
        <section id="como-funciona" className="border-b border-border/60 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Como funciona</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
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
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 font-serif text-base font-semibold">{title}</h3>
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

        {/* Funcionalidades */}
        <section id="funcionalidades" className="border-b border-border/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Funcionalidades</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Tudo o que a sua rotina precisa. Nada além disso.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Cada recurso existe para tirar uma tarefa manual do seu dia.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-[18px] sm:grid-cols-2 sm:auto-rows-[150px] lg:grid-cols-4 lg:auto-rows-[170px]">
              {(() => {
                const featured = features.find((f) => f.title === "Evolução clínica")!;
                const rest = features.filter((f) => f.title !== "Evolução clínica");
                const FeaturedIcon = featured.icon;
                return (
                  <>
                    <div className="flex flex-col justify-between rounded-[18px] bg-brand-900 p-[26px] text-white sm:col-span-2 sm:row-span-1 sm:min-h-[220px] lg:row-span-2 lg:min-h-0">
                      <div>
                        <div className="mb-4 grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-white/[.12]">
                          <FeaturedIcon className="h-[19px] w-[19px] text-white" />
                        </div>
                        <h3 className="font-body text-lg font-extrabold text-white">{featured.title}</h3>
                        <p className="mt-1.5 text-sm text-white/68">
                          {featured.desc} — e é essa mesma nota que alimenta o financeiro.
                        </p>
                      </div>
                      <div className="mt-[18px] rounded-xl bg-white/[.08] px-3.5 py-3 font-mono text-xs text-white/85">
                        14:00 → nota salva → cobrança gerada
                      </div>
                    </div>
                    {rest.map(({ icon: Icon, title, desc }) => (
                      <div
                        key={title}
                        className="rounded-[18px] border border-line bg-canvas p-[26px] transition-all hover:-translate-y-1 hover:bg-paper hover:shadow-[0_10px_24px_-14px_rgba(14,31,82,.22)]"
                      >
                        <div className="mb-4 grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-brand-100">
                          <Icon className="h-[19px] w-[19px] text-brand-700" />
                        </div>
                        <h3 className="font-body text-[15.5px] font-extrabold text-ink">{title}</h3>
                        <p className="mt-1.5 text-sm text-body">{desc}</p>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section id="diferenciais" className="border-b border-border/60 bg-secondary/40 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Diferenciais</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  Por que o FisioGO?
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Nem pesado demais, nem frágil demais. O FisioGO é a gestão que cabe
                  no seu dia: leve o bastante pra usar entre um atendimento e outro,
                  completo o bastante pra profissionalizar sua rotina.
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
                        <h3 className="font-body text-sm font-semibold">{title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Depoimentos */}
        {/* TODO: substituir por conteúdo real — depoimentos abaixo são fictícios/placeholder */}
        <section id="depoimentos" className="border-b border-border/60 bg-canvas py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Depoimentos</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Fisioterapeutas que trocaram a planilha pelo FisioGO
              </h2>
            </div>
            <div className="mt-14 grid gap-[22px] sm:grid-cols-3">
              {testimonials.map(({ initials, color, quote, name, role }) => (
                <div key={name} className="rounded-xl border border-line bg-paper p-7">
                  <div className="flex gap-[3px] text-lp-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-[15px] w-[15px] fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-[15px] leading-[1.55] text-ink">"{quote}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-white ${color}`}
                    >
                      {initials}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-extrabold text-ink">{name}</div>
                      <div className="text-xs text-lp-muted">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preços */}
        {/* TODO: substituir por conteúdo real — valor abaixo é placeholder */}
        <section id="precos" className="border-b border-border/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Preços</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Um plano. Sem letra miúda.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tudo incluso desde o primeiro dia — sem módulo extra, sem limite de paciente escondido em
                contrato.
              </p>
            </div>
            <div className="mx-auto mt-14 max-w-[460px] rounded-2xl bg-brand-900 px-11 py-11 text-center text-white">
              <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.12em] text-lp-accent">
                Plano FisioGO
              </div>
              <div className="mt-3.5 font-serif text-[52px] leading-none">
                R${" "}
                <span className="underline decoration-dashed decoration-white/50 underline-offset-[6px]">
                  [valor]
                </span>
                <span className="font-body text-base font-medium text-white/60"> /mês</span>
              </div>
              <ul className="mt-7 flex flex-col gap-3 text-left">
                {[
                  "Agenda e pacientes ilimitados",
                  "Evolução clínica e plano de tratamento",
                  "Financeiro, relatórios e cobrança",
                  "Lembretes automáticos de sessão",
                  "Suporte por chat",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/88">
                    <Check className="h-4 w-4 shrink-0 text-lp-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-1.5 w-full bg-white text-brand-900 hover:bg-white/90"
                onClick={goSignup}
              >
                Começar 7 dias grátis
              </Button>
              <div className="mt-3.5 text-xs text-white/55">Sem cartão de crédito · cancele quando quiser</div>
            </div>
          </div>
        </section>

        {/* Instalar no celular */}
        <section id="instalar" className="border-b border-border/60 bg-canvas py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">No seu celular</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Tenha o FisioGO na tela inicial do celular
              </h2>
              <p className="mt-4 text-muted-foreground">
                Sem loja de aplicativos. Adicione o FisioGO à tela de início e abra em um toque — leva 20
                segundos e é grátis.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {installSteps.map(({ platform, badge, hint, steps }) => (
                <div key={platform} className="rounded-xl border border-line bg-paper p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-sans text-lg font-extrabold text-ink">{platform}</h3>
                      <p className="mt-1 text-sm text-body">{hint}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-600">
                      {badge}
                    </span>
                  </div>
                  <ol className="mt-6 divide-y divide-line">
                    {steps.map(({ icon: Icon, title, desc }, i) => (
                      <li key={title} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-100 text-brand-700">
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">
                            {i + 1} · {title}
                          </p>
                          <p className="mt-0.5 text-sm text-body">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-border/60 bg-secondary/40 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Dúvidas frequentes</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Antes de criar sua conta
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {faqs.map(({ q, a }, i) => {
                const isOpen = openFaq === i;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="rounded-xl border border-border bg-card p-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-body text-sm font-semibold">{q}</h3>
                      <Plus
                        className={`h-4 w-4 shrink-0 text-brand-700 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                      />
                    </div>
                    {isOpen && <p className="mt-2 text-sm text-muted-foreground">{a}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 px-8 py-14 text-center">
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Sua próxima semana pode ser mais leve.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/72">
                Crie sua conta gratuitamente e organize pacientes, agenda e financeiro hoje mesmo.
              </p>
              <Button
                size="lg"
                className="mt-8 bg-white text-brand-900 hover:bg-white/90"
                onClick={goSignup}
              >
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
