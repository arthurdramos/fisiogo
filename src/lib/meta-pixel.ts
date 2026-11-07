// Disparo de eventos do Meta Pixel pelo navegador. O script base (que
// define window.fbq) é carregado em src/routes/__root.tsx — aqui só
// chamamos ele, com segurança pra quando o pixel não está configurado
// (VITE_META_PIXEL_ID vazio) ou o script ainda não rodou.
export function trackMetaEvent(eventName: string, eventId: string, params: Record<string, unknown> = {}) {
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", eventName, params, { eventID: eventId });
}
