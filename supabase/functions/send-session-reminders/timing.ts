export function reminderWindow(now: number) {
  return {
    start: new Date(now - 120 * 60 * 1000).toISOString(),
    end: new Date(now - 60 * 60 * 1000).toISOString(),
  };
}