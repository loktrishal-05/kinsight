import texts from "./fixtures/notifications.json";

// Content-free notifications (issue 55). Texts come from configs/notifications.yaml and never name a condition,
// gene or result; nothing is sent unless the person switched that type on, on this device.
export const TYPES = Object.keys(texts.types) as (keyof typeof texts.types)[];
export type NotifyType = (typeof TYPES)[number];
export type Prefs = Partial<Record<NotifyType, boolean>>;
export type Snapshot = { reviews: Record<string, string>; labStage: number | null; bookingAt: number | null };

const KEY = "ks_notify";
export function readPrefs(): Prefs {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export function writePrefs(prefs: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
}

// What changed since the last look, as notification types. Pure, so it is tested without a browser.
export function changes(prev: Snapshot | null, next: Snapshot, prefs: Prefs, now: number): NotifyType[] {
  if (!prev) return [];
  const out = new Set<NotifyType>();
  for (const [kind, state] of Object.entries(next.reviews)) {
    if (prev.reviews[kind] && prev.reviews[kind] !== state) out.add(kind === "reclassification" ? "reclassification_reviewed" : "counsellor_update");
  }
  if (prev.labStage !== null && next.labStage !== null && next.labStage > prev.labStage) out.add("lab_status");
  const tomorrow = (at: number | null) => at !== null && at - now > 0 && at - now <= 36 * 3600;
  if (tomorrow(next.bookingAt) && !tomorrow(prev.bookingAt)) out.add("appointment_reminder");
  return [...out].filter((t) => prefs[t]);
}

export async function show(type: NotifyType) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body: texts.types[type].body, tag: type, icon: "/kin-logo.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return void (await reg.showNotification(texts.title, options));
  } catch { /* fall back to a page notification */ }
  new Notification(texts.title, options);
}
