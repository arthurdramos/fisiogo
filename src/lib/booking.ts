// Agendamento online: cálculo dos horários livres mostrados na página pública
// /agendar/<endereço>. Os horários de atendimento são cadastrados no relógio
// de Brasília (sem horário de verão desde 2019, UTC-3 o ano todo); o banco
// refaz a mesma validação em request_booking antes de aceitar o pedido.

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export type BookingHour = { weekday: number; inicio: string; fim: string };
export type BusyInterval = { inicio: string; fim: string };
export type BookingDay = { dia: string; weekday: number; slots: string[] };

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Dias com horários livres, a partir de hoje (em Brasília), cada horário em
// ISO/UTC. Os horários seguem a grade da duração da sessão a partir do início
// de cada faixa de atendimento.
export function computeSlots(v: {
  hours: BookingHour[];
  busy: BusyInterval[];
  duracaoMin: number;
  janelaDias: number;
  antecedenciaHoras: number;
  now?: Date;
}): BookingDay[] {
  const now = (v.now ?? new Date()).getTime();
  const earliest = now + v.antecedenciaHoras * 60 * MIN_MS;
  const busy = v.busy.map((b) => [Date.parse(b.inicio), Date.parse(b.fim)] as const);
  const nowBrt = new Date(now - BRT_OFFSET_MS); // campos UTC = relógio de Brasília

  const days: BookingDay[] = [];
  for (let i = 0; i < v.janelaDias; i++) {
    const dayStart = Date.UTC(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate() + i);
    const weekday = new Date(dayStart).getUTCDay();
    const slots: string[] = [];
    const windows = v.hours
      .filter((h) => h.weekday === weekday)
      .sort((a, b) => minutesOf(a.inicio) - minutesOf(b.inicio));
    for (const w of windows) {
      const fim = minutesOf(w.fim);
      for (let m = minutesOf(w.inicio); m + v.duracaoMin <= fim; m += v.duracaoMin) {
        const start = dayStart + m * MIN_MS + BRT_OFFSET_MS;
        const end = start + v.duracaoMin * MIN_MS;
        if (start < earliest) continue;
        if (busy.some(([bs, be]) => bs < end && be > start)) continue;
        slots.push(new Date(start).toISOString());
      }
    }
    if (slots.length > 0) days.push({ dia: new Date(dayStart).toISOString().slice(0, 10), weekday, slots });
  }
  return days;
}

export function formatBrtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

// "quinta-feira, 30 de outubro" a partir de "2026-10-30".
export function formatBrtDay(dia: string) {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

// Endereço da página a partir do nome: "Felipe Granata" -> "felipe-granata".
export function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string) {
  return slug.length >= 3 && slug.length <= 40 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
