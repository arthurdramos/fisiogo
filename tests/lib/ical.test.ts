import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  escapeIcsText,
  foldIcsLine,
  googleCalendarUrl,
  icsDate,
  outlookCalendarUrl,
  sessionEnd,
  subscribeUrls,
} from "../../src/lib/ical";

describe("icsDate", () => {
  it("formats in UTC without separators or milliseconds", () => {
    expect(icsDate(new Date("2026-10-30T11:00:00.000Z"))).toBe("20261030T110000Z");
  });
});

describe("escapeIcsText", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeIcsText("Ana, Souza; a\\b\nlinha")).toBe("Ana\\, Souza\\; a\\\\b\\nlinha");
  });
});

describe("foldIcsLine", () => {
  it("keeps short lines intact", () => {
    expect(foldIcsLine("SUMMARY:Sessão")).toBe("SUMMARY:Sessão");
  });
  it("folds long lines at 75 bytes, counting accents as two bytes", () => {
    const line = "DESCRIPTION:" + "ã".repeat(60);
    const folded = foldIcsLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("buildCalendar", () => {
  it("builds a CRLF calendar with one event per session", () => {
    const ics = buildCalendar({
      name: "FisioGO",
      now: new Date("2026-10-29T12:00:00Z"),
      events: [
        {
          uid: "abc@fisiogo.online",
          start: new Date("2026-10-30T11:00:00Z"),
          end: sessionEnd("2026-10-30T11:00:00Z", 50),
          summary: "Sessão · Ana Souza",
          description: "Paciente confirmou presença.",
        },
      ],
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("UID:abc@fisiogo.online\r\n");
    expect(ics).toContain("DTSTART:20261030T110000Z\r\nDTEND:20261030T115000Z\r\n");
    expect(ics).toContain("SUMMARY:Sessão · Ana Souza\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("add-to-calendar links", () => {
  const ev = {
    title: "Fisioterapia com Felipe",
    start: new Date("2026-10-30T11:00:00Z"),
    end: new Date("2026-10-30T11:50:00Z"),
  };
  it("builds the Google template link", () => {
    const url = new URL(googleCalendarUrl(ev));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("dates")).toBe("20261030T110000Z/20261030T115000Z");
    expect(url.searchParams.get("text")).toBe("Fisioterapia com Felipe");
  });
  it("builds the Outlook compose link", () => {
    const url = new URL(outlookCalendarUrl(ev));
    expect(url.searchParams.get("startdt")).toBe("2026-10-30T11:00:00.000Z");
    expect(url.searchParams.get("subject")).toBe("Fisioterapia com Felipe");
  });
  it("builds subscription links from the feed URL", () => {
    const links = subscribeUrls("https://fisiogo.online/api/public/calendar/abc");
    expect(links.apple).toBe("webcal://fisiogo.online/api/public/calendar/abc");
    expect(links.google).toBe(
      "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Ffisiogo.online%2Fapi%2Fpublic%2Fcalendar%2Fabc",
    );
  });
});
