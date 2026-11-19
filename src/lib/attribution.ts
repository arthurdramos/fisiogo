// De onde veio cada cadastro (Instagram, anúncio, Google, indicação...).
//
// Na chegada ao site guardamos no navegador as UTMs e o site de origem
// (document.referrer). No primeiro acesso autenticado isso vai pra Edge
// Function ensure-professional-profile, que grava em signup_attribution.
// O Meta Pixel já mede conversão de anúncio, mas só enxerga o próprio Meta;
// aqui fica a origem de todo mundo, no nosso banco, pra cruzar com assinatura.
//
// Regra: vale a primeira visita "com origem" (UTM ou outro site) dos últimos
// 30 dias. Uma visita direta (digitou o endereço, voltou pelo favorito)
// nunca apaga uma origem já guardada.

const KEY = "fisiogo_attribution";
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path?: string;
  first_seen_at: string;
};

const corta = (v: string | null | undefined, max = 200) => (v ? v.slice(0, max) : undefined);

function ler(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    if (Date.now() - new Date(a.first_seen_at).getTime() > VALIDADE_MS) return null;
    // Guardado antes da correção dos referrers de login: não é origem, e
    // deixá-lo bloquearia ("primeira origem vence") uma origem real depois.
    if (a.referrer && REFERRERS_DE_LOGIN.some((h) => a.referrer === `https://${h}`)) delete a.referrer;
    return a;
  } catch {
    return null;
  }
}

// Volta do login com Google: o navegador chega de uma dessas páginas, mas a
// pessoa não "veio" de lá. Contar isso como origem apagava a visita direta.
// A Edge Function ensure-professional-profile repete a lista para descartar
// o que já estava guardado no navegador antes desta correção.
const REFERRERS_DE_LOGIN = ["oauth.lovable.app", "accounts.google.com"];

// Site de origem que vale como atribuição, ou null. Ignora o próprio site, as
// páginas de login e qualquer chegada em /app: ali só se chega voltando do
// login ou pelo link do e-mail de confirmação (o "referrer" seria o Gmail),
// nunca por um link de divulgação.
export function referrerDeOrigem(referrer: string, siteOrigin: string, pathname: string): string | null {
  if (!referrer || pathname === "/app" || pathname.startsWith("/app/")) return null;
  try {
    const url = new URL(referrer);
    if (url.origin === siteOrigin || !url.hostname) return null;
    if (REFERRERS_DE_LOGIN.includes(url.hostname)) return null;
    // Apps Android chegam como android-app://com.instagram.android, cujo
    // origin é "null": guarda esquema + pacote, que é a origem de verdade.
    return url.origin !== "null" ? url.origin : `${url.protocol}//${url.hostname}`;
  } catch {
    return null; // referrer malformado
  }
}

const temOrigem = (a: Attribution | null) => !!a && (!!a.utm_source || !!a.referrer);

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const atual: Attribution = { first_seen_at: new Date().toISOString(), landing_path: corta(window.location.pathname) };
  for (const k of UTM_KEYS) {
    const v = corta(params.get(k)?.trim());
    if (v) atual[k] = v;
  }
  // fbclid/gclid sem UTM = clique em anúncio do Meta/Google sem tag manual.
  if (!atual.utm_source && params.get("fbclid")) atual.utm_source = "facebook_click";
  if (!atual.utm_source && params.get("gclid")) atual.utm_source = "google_ads";
  const referrer = referrerDeOrigem(document.referrer, window.location.origin, window.location.pathname);
  if (referrer) atual.referrer = corta(referrer);

  const salvo = ler();
  if (temOrigem(salvo)) return; // primeira origem vence
  if (salvo && !temOrigem(atual)) return; // visita direta não sobrescreve nada
  try {
    localStorage.setItem(KEY, JSON.stringify(atual));
  } catch {
    // navegação privada / armazenamento bloqueado: segue sem atribuição
  }
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  return ler();
}
