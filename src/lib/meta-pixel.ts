// Disparo de eventos do Meta Pixel pelo navegador. O script base (que
// define window.fbq) é carregado em src/routes/__root.tsx — aqui só
// chamamos ele, com segurança pra quando o pixel não está configurado
// (VITE_META_PIXEL_ID vazio) ou o script ainda não rodou.
export function trackMetaEvent(eventName: string, eventId: string, params: Record<string, unknown> = {}) {
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", eventName, params, { eventID: eventId });
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// _fbp e _fbc são os cookies que o próprio script do Pixel grava no
// navegador (_fbp sempre, _fbc só quando a visita veio de um link de
// anúncio com fbclid). Mandar os dois pro evento StartTrial do lado do
// servidor (Conversions API) é o que deixa a Meta casar esse evento com o
// clique real no anúncio, mesmo quando o navegador bloqueia ou atrasa o
// pixel — sem eles, a correspondência fica só por e-mail/IP, mais fraca.
export function getMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}
