import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";

// Moldura das páginas do blog: mesmo cabeçalho da landing (menu das seções,
// Entrar e Começar grátis) e o mesmo rodapé — o blog existe pra trazer cadastro.
export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center">
            <img src="/logo-fisiogo-transparente.png" alt="FisioGO" className="h-9 w-auto" />
          </Link>

          <SiteNav />

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Começar grátis
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span className="text-xs text-muted-foreground/80">
            Desenvolvido por Flowvia — FLOWVIA DESENVOLVIMENTO DE SOFTWARE CUSTOMIZAVEL LTDA · CNPJ
            68.558.820/0001-37
          </span>
          <span>© {new Date().getFullYear()} FisioGO</span>
        </div>
      </footer>
    </div>
  );
}

// Chamada no fim de cada post.
export function BlogCta() {
  return (
    <aside className="mt-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="font-serif text-2xl font-semibold text-foreground">
        Organize seu consultório em um só lugar
      </p>
      <p className="mt-2 text-muted-foreground">
        Pacientes, agenda, lembretes por WhatsApp, evolução clínica e financeiro no FisioGO. Teste
        grátis por 7 dias, sem cartão de crédito.
      </p>
      <Button asChild size="lg" className="mt-5">
        <Link to="/auth" search={{ mode: "signup" }}>
          Criar conta grátis
        </Link>
      </Button>
    </aside>
  );
}
