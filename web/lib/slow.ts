// Free hosting sleeps when idle, so the first API call after a quiet period can take up to a minute.
// trackSlow() tells the UI when any call has been pending longer than SLOW_MS, so it can explain the wait.
export const SLOW_MS = 4000;
export const SLOW_EVENT = "kin:api-slow";

let slowInFlight = 0;

function announce(slow: boolean) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SLOW_EVENT, { detail: { slow } }));
}

export async function trackSlow<T>(call: Promise<T>, ms = SLOW_MS): Promise<T> {
  let counted = false;
  const timer = setTimeout(() => { counted = true; if (++slowInFlight === 1) announce(true); }, ms);
  try {
    return await call;
  } finally {
    clearTimeout(timer);
    if (counted && --slowInFlight === 0) announce(false);
  }
}
