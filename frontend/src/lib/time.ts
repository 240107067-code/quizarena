/** Seconds left on the current question, using the server clock offset. */
export function secondsLeft(startedAt: number | null, limit: number, serverNow: number, receivedAt: number, now = Date.now()): number {
  if (startedAt == null) return limit;
  const elapsed = serverNow - startedAt + (now - receivedAt);
  return Math.max(0, Math.ceil(limit - elapsed / 1000));
}
