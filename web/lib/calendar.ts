// Calendar links for a booked session (issue 54). The event text is fixed and generic on purpose: calendars sync to
// phones, watches and shared family accounts, so nothing about a condition, gene or result may ever appear in it.
export const SUMMARY = "KinSight appointment";
const DETAILS = "Your KinSight counselling appointment.";

const stamp = (seconds: number) => new Date(seconds * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeCalendarText = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// RFC 5545 3.1: lines longer than 75 octets are folded with CRLF followed by a space.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (parts.length ? 74 : 75)) { parts.push(current); current = ""; }
    current += ch;
  }
  return [...parts, current].join("\r\n ");
}

export function ics({ id, start, minutes = 45, video, now = Date.now() / 1000 }: { id: string; start: number; minutes?: number; video?: string; now?: number }): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KinSight//Appointment//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@kinsight.invalid`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + minutes * 60)}`,
    `SUMMARY:${escapeCalendarText(SUMMARY)}`,
    `DESCRIPTION:${escapeCalendarText(video ? `${DETAILS}\nVideo: ${video}` : DETAILS)}`,
    ...(video ? [`URL:${video}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleUrl(start: number, minutes = 45, video?: string): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: SUMMARY, dates: `${stamp(start)}/${stamp(start + minutes * 60)}`, details: video ? `${DETAILS}\n${video}` : DETAILS });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookUrl(start: number, minutes = 45, video?: string): string {
  const iso = (s: number) => new Date(s * 1000).toISOString();
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: SUMMARY, startdt: iso(start), enddt: iso(start + minutes * 60), body: video ? `${DETAILS}\n${video}` : DETAILS });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q}`;
}

// A hard-to-guess public video room for this booking, created once in this browser. Only the two parties get the link.
export function videoRoom(bookingId: string): string {
  const key = `ks_video_${bookingId}`;
  try {
    const kept = sessionStorage.getItem(key);
    if (kept) return kept;
  } catch { /* private mode */ }
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const room = `https://meet.jit.si/KinSight-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  try { sessionStorage.setItem(key, room); } catch { /* private mode */ }
  return room;
}
