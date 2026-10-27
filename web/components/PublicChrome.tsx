"use client";
// Brand mark and language switch shared by the public pages (landing and sign-in), which sit outside the app shell.
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-brand-800">
      <img src="/kin-logo.png" alt="" className="h-8 w-8 rounded-lg" /><span className="max-[440px]:sr-only">KinSight</span>
    </Link>
  );
}

export { default as LangSwitch } from "./LanguageSelect";
