import { describe, expect, it } from "vitest";
import { layoutDay } from "../../src/lib/agenda-layout";

// Horários locais, montados com new Date(y, m, d, h, min) pra não depender do fuso da máquina.
const at = (h: number, min = 0) => new Date(2026, 10, 12, h, min).toISOString();
const s = (id: string, h: number, min: number, duration_min: number) => ({
  id,
  scheduled_at: at(h, min),
  duration_min,
});

const summary = (blocks: ReturnType<typeof layoutDay<ReturnType<typeof s>>>) =>
  blocks.map((b) => ({ ids: b.sessions.map((x) => x.id), col: b.col, cols: b.cols }));

describe("layoutDay", () => {
  it("keeps a lone session full width", () => {
    const blocks = layoutDay([s("a", 8, 0, 50)]);
    expect(summary(blocks)).toEqual([{ ids: ["a"], col: 0, cols: 1 }]);
    expect(blocks[0]).toMatchObject({ startMin: 480, endMin: 530 });
  });

  it("merges sessions with the same start and duration into one group block", () => {
    const blocks = layoutDay([s("a", 8, 0, 50), s("b", 8, 0, 50), s("c", 8, 0, 50)]);
    expect(summary(blocks)).toEqual([{ ids: ["a", "b", "c"], col: 0, cols: 1 }]);
  });

  it("puts partially overlapping blocks side by side", () => {
    const blocks = layoutDay([s("a", 8, 0, 60), s("b", 8, 30, 60)]);
    expect(summary(blocks)).toEqual([
      { ids: ["a"], col: 0, cols: 2 },
      { ids: ["b"], col: 1, cols: 2 },
    ]);
  });

  it("keeps same start but different duration as separate blocks", () => {
    const blocks = layoutDay([s("a", 8, 0, 30), s("b", 8, 0, 60)]);
    expect(summary(blocks)).toEqual([
      { ids: ["b"], col: 0, cols: 2 },
      { ids: ["a"], col: 1, cols: 2 },
    ]);
  });

  it("reuses a freed column and leaves unrelated sessions full width", () => {
    const blocks = layoutDay([
      s("a", 8, 0, 60),
      s("b", 8, 30, 60),
      s("c", 9, 0, 30),
      s("d", 14, 0, 50),
    ]);
    expect(summary(blocks)).toEqual([
      { ids: ["a"], col: 0, cols: 2 },
      { ids: ["b"], col: 1, cols: 2 },
      { ids: ["c"], col: 0, cols: 2 },
      { ids: ["d"], col: 0, cols: 1 },
    ]);
  });

  it("does not treat back-to-back sessions as overlapping", () => {
    const blocks = layoutDay([s("a", 8, 0, 60), s("b", 9, 0, 60)]);
    expect(summary(blocks)).toEqual([
      { ids: ["a"], col: 0, cols: 1 },
      { ids: ["b"], col: 0, cols: 1 },
    ]);
  });
});
