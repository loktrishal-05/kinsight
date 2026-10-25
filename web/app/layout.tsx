import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import Shell from "@/components/Shell";

export const metadata = { title: "KinSight", description: "Fictional demo: inherited-risk navigator" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
