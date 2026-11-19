import { describe, expect, it } from "vitest";
import { splitReceivable } from "../../src/lib/receivable";

const s = (status: string, pago: boolean, valor: number) => ({ status, pago, valor });

describe("splitReceivable", () => {
  it("separates performed unpaid sessions from scheduled ones", () => {
    const rows = [
      s("realizada", false, 150),
      s("realizada", false, 150),
      s("agendada", false, 300),
      s("agendada", false, 300),
    ];
    expect(splitReceivable(rows, (r) => r.valor)).toEqual({
      realizado: 300,
      agendado: 600,
      sessoesAgendadas: 2,
    });
  });

  it("ignores paid and cancelled sessions", () => {
    const rows = [s("realizada", true, 150), s("cancelada", false, 150), s("agendada", true, 300)];
    expect(splitReceivable(rows, (r) => r.valor)).toEqual({
      realizado: 0,
      agendado: 0,
      sessoesAgendadas: 0,
    });
  });
});
