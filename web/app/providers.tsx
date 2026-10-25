"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { PrefsProvider } from "@/lib/prefs";
import { DemoProvider } from "@/lib/demo";
import { SessionProvider } from "@/lib/session";

export default function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 0, retry: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <PrefsProvider>
        <I18nProvider>
          <SessionProvider>
            <DemoProvider>{children}</DemoProvider>
          </SessionProvider>
        </I18nProvider>
      </PrefsProvider>
    </QueryClientProvider>
  );
}
