"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { SessionProvider } from "@/lib/session";

export default function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 0, retry: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <SessionProvider>{children}</SessionProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
