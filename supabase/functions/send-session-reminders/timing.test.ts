import { describe, expect, it } from "vitest";
import { reminderWindow } from "./timing";

describe("hourly confirmation reminders", () => {
  it("waits one hour after the scheduled session", () => {
    expect(reminderWindow(Date.parse("2026-10-29T17:00:00Z")).end).toBe("2026-10-29T16:00:00.000Z");
  });
  it("covers the full hour between scheduled executions", () => {
    expect(reminderWindow(Date.parse("2026-10-29T17:00:00Z")).start).toBe("2026-10-29T15:00:00.000Z");
  });
});