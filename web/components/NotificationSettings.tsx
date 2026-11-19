"use client";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { readPrefs, TYPES, writePrefs, type Prefs } from "@/lib/notify";

// Opt-in per type, off by default, remembered on this device only.
export default function NotificationSettings() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [permission, setPermission] = useState<string>("default");
  useEffect(() => {
    setPrefs(readPrefs());
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);
  const toggle = async (type: (typeof TYPES)[number]) => {
    const next = { ...prefs, [type]: !prefs[type] };
    if (next[type] && typeof Notification !== "undefined" && Notification.permission === "default") {
      setPermission(await Notification.requestPermission());
    }
    setPrefs(next);
    writePrefs(next);
  };
  return (
    <section className="card space-y-3" aria-labelledby="notify-title" data-demo="notifications">
      <h2 id="notify-title" className="flex items-center gap-2 text-lg font-semibold"><Bell aria-hidden className="h-5 w-5" />{t("notify.title")}</h2>
      <p className="text-sm text-muted">{t("notify.lead")}</p>
      {TYPES.map((type) => (
        <label key={type} className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4" checked={!!prefs[type]} onChange={() => toggle(type)} />
          {t(`notify.type.${type}`)}
        </label>
      ))}
      {permission === "denied" && <p role="status" className="text-sm">{t("notify.denied")}</p>}
      {permission === "unsupported" && <p role="status" className="text-sm">{t("notify.unsupported")}</p>}
    </section>
  );
}
