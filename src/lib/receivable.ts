// "À receber" separado em duas partes, usado na ficha do paciente e no
// Financeiro:
//   - realizado: sessões já atendidas e não pagas (o que dá pra cobrar hoje,
//     é o que aparece na aba Cobrança e entra no PDF);
//   - agendado: sessões marcadas que ainda não foram realizadas (receita
//     prevista). Inclui agendadas com data passada que ninguém marcou.
// Canceladas e pagas não entram.

export type ReceivableSplit = {
  realizado: number;
  agendado: number;
  sessoesAgendadas: number;
};

export function splitReceivable<T extends { status: string; pago: boolean }>(
  sessions: T[],
  valor: (s: T) => number,
): ReceivableSplit {
  const out: ReceivableSplit = { realizado: 0, agendado: 0, sessoesAgendadas: 0 };
  for (const s of sessions) {
    if (s.pago || s.status === "cancelada") continue;
    if (s.status === "realizada") {
      out.realizado += valor(s);
    } else {
      out.agendado += valor(s);
      out.sessoesAgendadas += 1;
    }
  }
  return out;
}
