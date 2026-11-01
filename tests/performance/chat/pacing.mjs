// Absolute-deadline pacing: timer lateness must not accumulate across callbacks.
// Dependency injection keeps five-minute timing regression tests instantaneous.
export function createPacer({ rate, seconds, totalMessages, now, setTimer, clearTimer, send, onLag, onMiss, onEnd }) {
  const total = totalMessages ?? rate * seconds;
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('Pacing requires a positive integer message count and a positive duration.');
  }
  // Exact count is authoritative; do not derive a fractional count from float RPS.
  const spacing = seconds * 1000 / total;
  let origin, deadline, next = 0, timer, endTimer, started = false, closed = false;

  function cancel() {
    closed = true;
    clearTimer(timer);
    clearTimer(endTimer);
  }
  function finish() {
    if (closed) return;
    if (next < total) onMiss(total - next);
    cancel();
    onEnd();
  }
  function tick() {
    if (closed) return;
    const time = now();
    if (time >= deadline) return finish();
    const due = origin + next * spacing;
    if (time < due) {
      timer = setTimer(tick, Math.max(1, Math.ceil(due - time)));
      return;
    }
    // If a whole slot was missed, skip it; never burst-send a backlog to make
    // the count appear correct. Exact sent-count and missed-slot thresholds fail.
    const latestSlot = Math.min(total - 1, Math.floor((time - origin) / spacing));
    if (latestSlot > next) {
      onMiss(latestSlot - next);
      next = latestSlot;
    }
    onLag(time - (origin + next * spacing));
    send();
    next += 1;
    if (!closed && next < total) {
      timer = setTimer(tick, Math.max(1, Math.ceil(origin + next * spacing - now())));
    }
  }
  return {
    start() {
      if (started || closed) throw new Error('Pacer may only start once');
      started = true;
      origin = now();
      deadline = origin + seconds * 1000;
      endTimer = setTimer(finish, seconds * 1000);
      tick();
    },
    cancel,
  };
}
