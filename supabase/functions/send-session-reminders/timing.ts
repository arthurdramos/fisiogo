export function reminderWindow(now: number) {
  return {
    start: new Date(now - 120 * 60 * 1000).toISOString(),
    end: new Date(now - 60 * 60 * 1000).toISOString(),
  };
}

// Sem horário de verão desde 2019: Brasília é UTC-3 o ano todo.
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
export const DIGEST_HOUR_BRT = 18;

// Aviso da véspera pro profissional ("N sessões amanhã"): só na execução das
// 18h de Brasília, cobrindo o dia seguinte inteiro (00h–24h de Brasília).
// Fora desse horário devolve null.
export function tomorrowDigest(now: number) {
  const brt = new Date(now + BRT_OFFSET_MS); // campos UTC = relógio de Brasília
  if (brt.getUTCHours() !== DIGEST_HOUR_BRT) return null;
  const tomorrowBrt = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() + 1);
  const start = tomorrowBrt - BRT_OFFSET_MS;
  return {
    dia: new Date(tomorrowBrt).toISOString().slice(0, 10),
    start: new Date(start).toISOString(),
    end: new Date(start + 24 * 60 * 60 * 1000).toISOString(),
  };
}
