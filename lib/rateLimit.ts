// Global politeness limiter for requests to the source (kg.dbapp.ru).
// Shared by page-view refreshes AND bulk scripts within a process, so overlapping
// work can't spike: caps concurrency and spaces request starts.
const MAX_CONCURRENT = 6;
const MIN_INTERVAL_MS = 70; // ~14 req/s ceiling

let active = 0;
let lastStart = 0;
const waiters: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function releaseSlot() {
  const next = waiters.shift();
  if (next) next();
  else active--;
}

export async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  await acquireSlot();
  // space out request starts
  const now = Date.now();
  const wait = Math.max(0, lastStart + MIN_INTERVAL_MS - now);
  lastStart = Math.max(now, lastStart + MIN_INTERVAL_MS);
  if (wait) await new Promise((r) => setTimeout(r, wait));
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}
