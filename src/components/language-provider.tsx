"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Locale = "en" | "fil";
type LanguageContextValue = { locale: Locale; toggle: () => void };
const storageKey = "annie-locale";
const subscribers = new Set<() => void>();
let memoryLocale: Locale | null = null;
const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  toggle: () => undefined,
});

function getSnapshot(): Locale {
  if (memoryLocale !== null) return memoryLocale;
  try {
    return window.localStorage.getItem(storageKey) === "fil" ? "fil" : "en";
  } catch {
    return "en";
  }
}

function getServerSnapshot(): Locale {
  return "en";
}

function emitChange() {
  subscribers.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) {
    memoryLocale = null;
    emitChange();
  }
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0)
      window.removeEventListener("storage", onStorage);
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function toggle() {
    const next: Locale = locale === "en" ? "fil" : "en";
    memoryLocale = next;
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* The selected language still updates in this tab. */
    }
    document.documentElement.lang = next;
    emitChange();
  }

  return (
    <LanguageContext.Provider value={{ locale, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function T({ en, fil }: { en: string; fil: string }) {
  const { locale } = useLanguage();
  return locale === "fil" ? fil : en;
}
