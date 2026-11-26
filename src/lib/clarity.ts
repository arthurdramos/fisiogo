// Microsoft Clarity (gravação de sessão/heatmap). Carregado só na landing e
// no /auth — o app autenticado mostra dados clínicos de pacientes, que não
// podem ir pra gravação (ver data-clarity-mask em _authenticated/route.tsx).
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined;

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function loadClarity() {
  if (!CLARITY_ID || typeof window === "undefined") return;
  const w = window as Window & { clarity?: ClarityFn };
  if (w.clarity) return;
  const clarity: ClarityFn = (...args) => {
    (clarity.q ??= []).push(args);
  };
  w.clarity = clarity;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(script);
}
