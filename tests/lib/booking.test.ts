import { describe, expect, it } from "vitest";
import { computeSlots, formatBrtDay, formatBrtTime, isValidSlug, slugify } from "../../src/lib/booking";

// Quinta, 29/10/2026, 10:00 em Brasília (13:00 UTC).
const now = new Date("2026-10-29T13:00:00Z");
const seg_a_sex = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, inicio: "08:00", fim: "12:00" }));

describe("computeSlots", () => {
  it("lists slots on the session-length grid, in Brasília time", () => {
    const days = computeSlots({ hours: seg_a_sex, busy: [], duracaoMin: 60, janelaDias: 2, antecedenciaHoras: 0, now });
    // Hoje (qui) só sobram 10h e 11h; amanhã (sex) 8h a 11h.
    expect(days).toEqual([
      { dia: "2026-10-29", weekday: 4, slots: ["2026-10-29T13:00:00.000Z", "2026-10-29T14:00:00.000Z"] },
      {
        dia: "2026-10-30",
        weekday: 5,
        slots: ["2026-10-30T11:00:00.000Z", "2026-10-30T12:00:00.000Z", "2026-10-30T13:00:00.000Z", "2026-10-30T14:00:00.000Z"],
      },
    ]);
  });

  it("skips slots that overlap a session or a pending request", () => {
    const days = computeSlots({
      hours: seg_a_sex,
      busy: [{ inicio: "2026-10-30T11:30:00.000Z", fim: "2026-10-30T12:20:00.000Z" }],
      duracaoMin: 60,
      janelaDias: 2,
      antecedenciaHoras: 0,
      now,
    });
    expect(days[1].slots).toEqual(["2026-10-30T13:00:00.000Z", "2026-10-30T14:00:00.000Z"]);
  });

  it("respects the minimum notice and leaves out days without hours", () => {
    const days = computeSlots({ hours: seg_a_sex, busy: [], duracaoMin: 60, janelaDias: 5, antecedenciaHoras: 24, now });
    // Janela de qui a seg; sábado e domingo não atendem; antes de sex 10h não pode.
    expect(days.map((d) => d.dia)).toEqual(["2026-10-30", "2026-11-02"]);
    expect(days[0].slots).toEqual(["2026-10-30T13:00:00.000Z", "2026-10-30T14:00:00.000Z"]);
  });

  it("does not offer a slot that would end after the window closes", () => {
    // 08:00 e 08:50 cabem até 09:45; 09:40 terminaria às 10:30.
    const days = computeSlots({
      hours: [{ weekday: 5, inicio: "08:00", fim: "09:45" }],
      busy: [],
      duracaoMin: 50,
      janelaDias: 2,
      antecedenciaHoras: 0,
      now,
    });
    expect(days[0].slots.map(formatBrtTime)).toEqual(["08:00", "08:50"]);
  });
});

describe("formatting", () => {
  it("formats day names from the date string", () => {
    expect(formatBrtDay("2026-10-30")).toBe("sexta-feira, 30 de outubro");
  });
});

describe("slugs", () => {
  it("builds an address from the name", () => {
    expect(slugify("  Felipe Granata Kosikovski ")).toBe("felipe-granata-kosikovski");
    expect(slugify("João Ação")).toBe("joao-acao");
  });
  it("validates the address", () => {
    expect(isValidSlug("felipe")).toBe(true);
    expect(isValidSlug("fe")).toBe(false);
    expect(isValidSlug("Felipe")).toBe(false);
    expect(isValidSlug("felipe--g")).toBe(false);
  });
});
