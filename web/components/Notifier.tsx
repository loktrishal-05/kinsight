"use client";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { changes, readPrefs, show, type Snapshot } from "@/lib/notify";
import { useSession } from "@/lib/session";

// Looks once a minute while KinSight is open, and only for people who switched a notification type on.
// The notification itself never carries health information (lib/notify.ts, configs/notifications.yaml).
export default function Notifier() {
  const { persona } = useSession();
  const last = useRef<Snapshot | null>(null);
  useEffect(() => {
    if (persona !== "person_a" && persona !== "person_b") return;
    let alive = true;
    const look = async () => {
      const prefs = readPrefs();
      if (!Object.values(prefs).some(Boolean)) return;
      const [reviews, lab] = await Promise.all([api.myReviews().catch(() => []), api.tracker().catch(() => null)]);
      const booking = api.demoBooking();
      const next: Snapshot = {
        reviews: Object.fromEntries(reviews.map((r) => [r.kind, r.state])),
        labStage: lab?.stage ?? null,
        bookingAt: booking?.status === "booked" ? booking.slot_at : null,
      };
      if (!alive) return;
      for (const type of changes(last.current, next, prefs, Date.now() / 1000)) await show(type);
      last.current = next;
    };
    void look();
    const id = window.setInterval(look, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [persona]);
  return null;
}
