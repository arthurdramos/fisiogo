import { describe, expect, it } from "vitest";
import { reminderWindow, tomorrowDigest } from "./timing";

describe("hourly confirmation reminders", () => {
  it("waits one hour after the scheduled session", () => {
    expect(reminderWindow(Date.parse("2026-10-29T17:00:00Z")).end).toBe("2026-10-29T16:00:00.000Z");
  });
  it("covers the full hour between scheduled executions", () => {
    expect(reminderWindow(Date.parse("2026-10-29T17:00:00Z")).start).toBe("2026-10-29T15:00:00.000Z");
  });
});

describe("day-before patient reminder digest", () => {
  it("runs at 18h Brasília and covers the whole next day in Brasília time", () => {
    expect(tomorrowDigest(Date.parse("2026-10-29T21:00:30Z"))).toEqual({
      dia: "2026-10-30",
      start: "2026-10-30T03:00:00.000Z",
      end: "2026-10-31T03:00:00.000Z",
    });
  });
  it("rolls over month ends", () => {
    expect(tomorrowDigest(Date.parse("2026-10-31T21:10:00Z"))?.dia).toBe("2026-11-01");
  });
  it("does nothing outside the 18h execution", () => {
    expect(tomorrowDigest(Date.parse("2026-10-29T20:59:59Z"))).toBeNull();
    expect(tomorrowDigest(Date.parse("2026-10-29T22:00:00Z"))).toBeNull();
  });
});
