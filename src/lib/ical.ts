// Geração de calendário no formato iCalendar (RFC 5545) e dos links
// "adicionar à agenda" do Google e do Outlook. Usado pelo link de calendário
// que o profissional assina no Google/Outlook/iPhone e pelo botão que o
// paciente usa na página de confirmação da sessão.

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  lastModified?: Date;
};

// 20261030T110000Z — sempre em UTC, então não precisa de VTIMEZONE.
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Linhas de no máximo 75 bytes (UTF-8); a continuação começa com um espaço.
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildCalendar(v: { name: string; events: IcsEvent[]; now?: Date }): string {
  const stamp = icsDate(v.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FisioGO//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(v.name)}`,
    // Pedido de atualização a cada hora — o Google ignora e decide sozinho,
    // Outlook e iPhone costumam respeitar.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of v.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${escapeIcsText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    if (e.lastModified) lines.push(`LAST-MODIFIED:${icsDate(e.lastModified)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function sessionEnd(scheduledAt: string, durationMin: number): Date {
  return new Date(new Date(scheduledAt).getTime() + durationMin * 60 * 1000);
}

export function googleCalendarUrl(v: { title: string; start: Date; end: Date; details?: string }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: v.title,
    dates: `${icsDate(v.start)}/${icsDate(v.end)}`,
  });
  if (v.details) params.set("details", v.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(v: { title: string; start: Date; end: Date; details?: string }): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: v.title,
    startdt: v.start.toISOString(),
    enddt: v.end.toISOString(),
  });
  if (v.details) params.set("body", v.details);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Links pra assinar o calendário do profissional. O Google aceita o endereço
// webcal:// no parâmetro cid; o Outlook, o https:// no addfromweb; o iPhone
// abre o webcal:// direto.
export function subscribeUrls(feedUrl: string) {
  const webcal = feedUrl.replace(/^https?:\/\//, "webcal://");
  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent("FisioGO")}`,
    apple: webcal,
  };
}
