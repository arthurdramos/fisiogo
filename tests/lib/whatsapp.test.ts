import { describe, expect, it } from "vitest";
import { buildReminderMessage, normalizeBrazilPhone, sessionDayPhrase, whatsappUrl } from "../../src/lib/whatsapp";

describe("normalizeBrazilPhone", () => {
  it("adds the country code to DDD + number", () => {
    expect(normalizeBrazilPhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizeBrazilPhone("11 3456-7890")).toBe("551134567890");
  });
  it("drops the long-distance leading zero", () => {
    expect(normalizeBrazilPhone("011987654321")).toBe("5511987654321");
  });
  it("keeps numbers that already have the country code", () => {
    expect(normalizeBrazilPhone("+55 11 98765-4321")).toBe("5511987654321");
  });
  it("rejects empty or incomplete numbers", () => {
    expect(normalizeBrazilPhone(null)).toBeNull();
    expect(normalizeBrazilPhone("")).toBeNull();
    expect(normalizeBrazilPhone("98765-4321")).toBeNull();
  });
});

describe("sessionDayPhrase", () => {
  const now = new Date(2026, 9, 29, 18, 0);
  it("says hoje and amanhã for the next two days", () => {
    expect(sessionDayPhrase(new Date(2026, 9, 29, 20, 0).toISOString(), now)).toBe("hoje");
    expect(sessionDayPhrase(new Date(2026, 9, 30, 8, 0).toISOString(), now)).toBe("amanhã");
  });
  it("names the weekday and date further ahead", () => {
    expect(sessionDayPhrase(new Date(2026, 10, 2, 8, 0).toISOString(), now)).toBe("na segunda-feira, 02/11");
  });
});

describe("buildReminderMessage", () => {
  it("uses the first name, the time, the link and signs with the professional", () => {
    const text = buildReminderMessage({
      pacienteNome: "Ana Souza",
      profissionalNome: "Felipe",
      scheduledAt: new Date(2026, 9, 30, 8, 0).toISOString(),
      confirmUrl: "https://fisiogo.online/c/abc",
      now: new Date(2026, 9, 29, 18, 0),
    });
    expect(text).toBe(
      "Olá, Ana! Passando para lembrar da sua sessão de fisioterapia amanhã às 08:00.\n\n" +
        "Pode confirmar sua presença por aqui? https://fisiogo.online/c/abc\n\nFelipe",
    );
  });
  it("is encoded for the wa.me link", () => {
    expect(whatsappUrl("5511987654321", "Olá, Ana!")).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Ana!");
  });
});
