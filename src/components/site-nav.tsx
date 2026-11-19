import { Link } from "@tanstack/react-router";

// Links do menu do topo do site público, compartilhados pela landing e pelo
// blog pra os dois menus não ficarem diferentes. As seções são âncoras da
// landing: lá viram "#secao" (rola a página), fora dela "/#secao".
export const SECOES = [
  { id: "funcionalidades", label: "Funcionalidades" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "depoimentos", label: "Depoimentos" },
  { id: "precos", label: "Preços" },
  { id: "faq", label: "Dúvidas" },
] as const;

const linkClass = "transition-colors hover:text-foreground";

export function SiteNav({ naLanding = false }: { naLanding?: boolean }) {
  return (
    <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
      {SECOES.map((s) =>
        naLanding ? (
          <a key={s.id} href={`#${s.id}`} className={linkClass}>
            {s.label}
          </a>
        ) : (
          <Link key={s.id} to="/" hash={s.id} className={linkClass}>
            {s.label}
          </Link>
        ),
      )}
      <Link to="/blog" className={linkClass} activeProps={{ className: "text-foreground" }}>
        Blog
      </Link>
    </nav>
  );
}
