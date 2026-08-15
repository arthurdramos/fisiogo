import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, LayoutDashboard, Users, Calendar, Wallet, CreditCard, UserCog, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
    </div>
  ),
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const fetchSub = () =>
      supabase
        .from("subscriptions")
        .select("status, trial_ends_at")
        .eq("user_id", data.user.id)
        .maybeSingle()
        .then((res) => res.data);

    let sub = await fetchSub();

    if (!sub) {
      // Primeira vez que vemos esse usuário: garante a linha de trial via Edge Function
      // (a função no banco é SECURITY DEFINER restrita a service_role, o cliente não
      // pode chamá-la diretamente). Só paga esse custo uma vez por usuário.
      await supabase.functions.invoke("ensure-subscription");
      sub = await fetchSub();
    }

    const fetchProfile = () =>
      supabase
        .from("professional_profile")
        .select("nome, crefito, telefone, lgpd_aceite_em")
        .eq("user_id", data.user.id)
        .maybeSingle()
        .then((res) => res.data);

    let profile = await fetchProfile();

    if (!profile) {
      // Mesma lógica: cria a linha em professional_profile com os dados
      // (nome, crefito, telefone, aceite LGPD) informados no cadastro por
      // email/senha (vêm de user_metadata). Quem entra via Google nunca
      // passou por esse formulário, então a linha fica com os campos vazios
      // — daí a checagem de perfil incompleto logo abaixo.
      await supabase.functions.invoke("ensure-professional-profile");
      profile = await fetchProfile();
    }

    const profileComplete =
      !!profile?.nome && !!profile?.crefito && !!profile?.telefone && !!profile?.lgpd_aceite_em;

    // Evita loop de redirecionamento: a própria tela de completar cadastro não exige perfil completo.
    if (!profileComplete && location.pathname !== "/completar-perfil") {
      throw redirect({ to: "/completar-perfil" });
    }

    // Evita loop de redirecionamento: nem a tela de assinatura exige assinatura ativa, nem a de
    // completar cadastro exige assinatura ativa (senão alguém com perfil incompleto E assinatura
    // inativa fica preso indo de um lado pro outro — foi exatamente esse o bug reportado).
    if (location.pathname === "/assinatura" || location.pathname === "/completar-perfil") {
      return { user: data.user, profileComplete };
    }

    const trialActive = !!sub && sub.status === "trial" && new Date(sub.trial_ends_at) > new Date();
    const isActive = sub?.status === "ativo" || trialActive;

    if (!isActive) throw redirect({ to: "/assinatura" });

    return { user: data.user, profileComplete };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/app", label: "Início", icon: LayoutDashboard },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
  { to: "/perfil", label: "Perfil", icon: UserCog },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profileComplete } = Route.useRouteContext();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-base font-semibold">FisioGO</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {!profileComplete ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Complete seu cadastro para liberar o menu.
            </p>
          ) : (
            nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })
          )}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6 md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-display font-semibold">FisioGO</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        {profileComplete && (
          <nav className="flex items-center gap-1 border-b border-border bg-background px-4 py-2 md:hidden">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs " +
                    (active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
