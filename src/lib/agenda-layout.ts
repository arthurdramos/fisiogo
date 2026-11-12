// Posicionamento das sessões de um dia na grade semanal da Agenda.
//
// Sessões que começam no mesmo instante e têm a mesma duração são uma aula em
// grupo (ou um encaixe) e viram um único bloco. Blocos que se sobrepõem sem
// coincidir (8:00 e 8:30, por exemplo) dividem a largura da coluna lado a lado,
// em vez de ficarem desenhados um em cima do outro.

export type DayBlock<T> = {
  key: string;
  sessions: T[];
  /** Minutos desde a meia-noite (horário local). */
  startMin: number;
  endMin: number;
  /** Coluna do bloco dentro do seu conjunto de sobreposições (0-based). */
  col: number;
  /** Quantas colunas esse conjunto de sobreposições usa. */
  cols: number;
};

export function layoutDay<T extends { scheduled_at: string; duration_min: number }>(
  sessions: T[],
): DayBlock<T>[] {
  const groups = new Map<string, DayBlock<T>>();
  for (const s of sessions) {
    const start = new Date(s.scheduled_at);
    const key = `${start.getTime()}|${s.duration_min}`;
    let block = groups.get(key);
    if (!block) {
      const startMin = start.getHours() * 60 + start.getMinutes();
      block = { key, sessions: [], startMin, endMin: startMin + s.duration_min, col: 0, cols: 1 };
      groups.set(key, block);
    }
    block.sessions.push(s);
  }

  const blocks = [...groups.values()].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin,
  );

  // Varre em ordem de início: cada conjunto de blocos ligados por sobreposição
  // ganha suas colunas, e todos do conjunto dividem a largura pelo mesmo número.
  let cluster: DayBlock<T>[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;
  const closeCluster = () => {
    for (const b of cluster) b.cols = colEnds.length;
    cluster = [];
    colEnds = [];
  };
  for (const b of blocks) {
    if (b.startMin >= clusterEnd) closeCluster();
    let col = colEnds.findIndex((end) => end <= b.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(b.endMin);
    } else {
      colEnds[col] = b.endMin;
    }
    b.col = col;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.endMin);
  }
  closeCluster();

  return blocks;
}
