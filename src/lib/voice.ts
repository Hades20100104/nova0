import { useEffect, useState } from "react";

export type Assistant = "nova" | "nevira";

export type VoicePrefs = {
  enabled: boolean;       // habilita TTS (auto-speak respuestas)
  micEnabled: boolean;    // habilita micro (STT)
  voiceURI: string | null;
  rate: number;           // 0.5 - 2 (JARVIS ~ 0.95)
  pitch: number;          // 0 - 2 (NEVIRA grave ~ 0.85, NOVA ~ 1.05)
  volume: number;         // 0 - 1
  lang: string;           // es-ES, en-US, etc.
};

export type VoicePrefsAll = { nova: VoicePrefs; nevira: VoicePrefs };

const DEFAULT_NOVA: VoicePrefs = {
  enabled: true, micEnabled: true, voiceURI: null,
  rate: 1.0, pitch: 1.05, volume: 1, lang: "es-ES",
};
const DEFAULT_NEVIRA: VoicePrefs = {
  enabled: true, micEnabled: true, voiceURI: null,
  rate: 0.95, pitch: 0.85, volume: 1, lang: "es-ES",
};
const DEFAULT_ALL: VoicePrefsAll = { nova: DEFAULT_NOVA, nevira: DEFAULT_NEVIRA };

const KEY = "nv-voice-prefs-v1";
const EVT = "nv-voice-prefs-change";

export function loadVoicePrefs(): VoicePrefsAll {
  if (typeof window === "undefined") return DEFAULT_ALL;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      nova: { ...DEFAULT_NOVA, ...(raw.nova || {}) },
      nevira: { ...DEFAULT_NEVIRA, ...(raw.nevira || {}) },
    };
  } catch { return DEFAULT_ALL; }
}
export function saveVoicePrefs(p: VoicePrefsAll) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(EVT));
}

export function useVoicePrefs(assistant: Assistant) {
  const [all, setAll] = useState<VoicePrefsAll>(() => loadVoicePrefs());
  useEffect(() => {
    const h = () => setAll(loadVoicePrefs());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  const update = (patch: Partial<VoicePrefs>) => {
    const next = { ...all, [assistant]: { ...all[assistant], ...patch } };
    saveVoicePrefs(next);
  };
  return { prefs: all[assistant], update };
}

/* ---------------- TTS (Web Speech) ---------------- */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);
  return voices;
}

// Strip markdown / emojis for cleaner TTS
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " bloque de código. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~|]+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, prefs: VoicePrefs) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleaned);
  u.rate = prefs.rate;
  u.pitch = prefs.pitch;
  u.volume = prefs.volume;
  u.lang = prefs.lang;
  if (prefs.voiceURI) {
    const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === prefs.voiceURI);
    if (v) u.voice = v;
  }
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/* ---------------- STT (Web Speech Recognition) ---------------- */
type SRConstructor = new () => SpeechRecognition;
type SpeechRecognition = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export function getSpeechRecognitionCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSttSupported() { return !!getSpeechRecognitionCtor(); }
export function isTtsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognizer(lang: string, onResult: (text: string, final: boolean) => void, onEnd: () => void): SpeechRecognition | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.continuous = false;
  r.interimResults = true;
  r.onresult = (e: SpeechRecognitionEvent) => {
    let text = "";
    let final = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    onResult(text, final);
  };
  r.onend = onEnd;
  r.onerror = onEnd;
  return r;
}
