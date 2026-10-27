// Browser speech helpers. Everything degrades to plain text: no support, no voice for the language, or a denied microphone
// never blocks the chat. Recognition and synthesis run in the browser; KinSight sends no audio anywhere.
import type { Lang } from "./assistant";

export const BCP47: Record<string, string> = { en: "en-US", ar: "ar-AE", hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN" };

type Rec = { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; abort(): void;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null };

const w = () => (typeof window === "undefined" ? undefined : (window as any));
export const canListen = () => !!(w()?.SpeechRecognition ?? w()?.webkitSpeechRecognition);
export const canSpeak = () => !!w()?.speechSynthesis && typeof w().SpeechSynthesisUtterance === "function";

export type ListenEnd = { transcript: string; error?: string };

/** Starts one push-to-talk capture. Returns a stop function. Resolves via `done` exactly once. */
export function listen(lang: Lang, done: (r: ListenEnd) => void, interim?: (t: string) => void): () => void {
  const Ctor = w()?.SpeechRecognition ?? w()?.webkitSpeechRecognition;
  if (!Ctor) { done({ transcript: "", error: "unsupported" }); return () => {}; }
  const rec: Rec = new Ctor();
  rec.lang = BCP47[lang]; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
  let text = "", finished = false;
  const finish = (error?: string) => { if (!finished) { finished = true; done({ transcript: text.trim(), error }); } };
  rec.onresult = (e: any) => {
    text = Array.from(e.results as ArrayLike<any>).map((r: any) => r[0].transcript).join(" ");
    interim?.(text);
  };
  rec.onerror = (e: any) => finish(e?.error ?? "error");
  rec.onend = () => finish();
  try { rec.start(); } catch { finish("error"); }
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

const voiceFor = (lang: Lang) => {
  const voices: { lang: string }[] = w()?.speechSynthesis?.getVoices?.() ?? [];
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) as SpeechSynthesisVoice | undefined;
};

// Chrome loads voices asynchronously: wait briefly for them before deciding there is none.
const voicesReady = () => new Promise<void>((resolve) => {
  const synth = w()?.speechSynthesis;
  if (!synth || (synth.getVoices?.() ?? []).length) return resolve();
  const done = () => { synth.removeEventListener?.("voiceschanged", done); resolve(); };
  synth.addEventListener?.("voiceschanged", done);
  setTimeout(done, 900);
});

export type SpeakResult = "spoken" | "no-voice" | "unsupported";

/** Reads text aloud in `lang`. If the browser has no voice for that language it says so instead of mispronouncing. */
export async function speak(text: string, lang: Lang, onStart?: () => void): Promise<SpeakResult> {
  await voicesReady();
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve("unsupported");
    const synth = w().speechSynthesis;
    const voice = voiceFor(lang);
    if (!voice) return resolve("no-voice");
    synth.cancel();
    const u = new (w().SpeechSynthesisUtterance)(text);
    u.lang = BCP47[lang]; u.voice = voice; u.rate = 0.95;
    u.onstart = () => onStart?.();
    u.onend = () => resolve("spoken");
    u.onerror = () => resolve("spoken");
    synth.speak(u);
  });
}

export const stopSpeaking = () => { try { w()?.speechSynthesis?.cancel(); } catch { /* ignore */ } };
