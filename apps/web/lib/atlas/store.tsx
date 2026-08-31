"use client";

/**
 * @file store.tsx
 * @description Client session state: adapted vacancies, editable profile,
 * and automated PDF CV parsing. Persisted to localStorage per session.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Profile,
  EMPTY_PROFILE,
  Vacancy,
  VacancyStatus,
  adaptCV,
  newId,
  seedVacancies,
} from "./mock";
import { createClient } from "@/lib/supabase/client";

const KEY = "atlas.deck.v6";

interface Persisted {
  vacancies: Vacancy[];
  profile: Profile;
}

function read(): Persisted {
  const fresh: Persisted = { vacancies: [], profile: EMPTY_PROFILE };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const p = JSON.parse(raw);
    return {
      vacancies: Array.isArray(p.vacancies) ? p.vacancies : [],
      profile: p.profile ?? EMPTY_PROFILE,
    };
  } catch {
    return fresh;
  }
}

interface DeckValue extends Persisted {
  get: (id: string | null | undefined) => Vacancy | undefined;
  adaptFromRaw: (raw: string) => Promise<Vacancy>;
  updateVacancy: (id: string, patch: Partial<Vacancy>) => void;
  markSent: (id: string) => void;
  removeVacancy: (id: string) => void;
  setProfile: (profile: Profile) => void;
  resetProfile: () => void;
  parseAndSetProfile: (fileOrText: File | string) => Promise<Profile>;
}

const DeckCtx = createContext<DeckValue | null>(null);

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>({ vacancies: [], profile: EMPTY_PROFILE });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = read();
    setState(loaded);
    setHydrated(true);

    // If logged in via Supabase, prefill email/name if profile is completely empty
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const u = data?.user;
        if (!u) return;
        setState((prev) => {
          if (!prev.profile.name && !prev.profile.email) {
            return {
              ...prev,
              profile: {
                ...prev.profile,
                name: (u.user_metadata?.full_name as string) || "",
                email: u.email || "",
              },
            };
          }
          return prev;
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota */
    }
  }, [state, hydrated]);

  const updateVacancy = useCallback(
    (id: string, patch: Partial<Vacancy>) =>
      setState((s) => ({
        ...s,
        vacancies: s.vacancies.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      })),
    [],
  );

  const setProfile = useCallback((profile: Profile) => {
    setState((s) => ({ ...s, profile }));
  }, []);

  const resetProfile = useCallback(() => {
    setState((s) => ({ ...s, profile: EMPTY_PROFILE }));
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const parseAndSetProfile = useCallback(async (fileOrText: File | string): Promise<Profile> => {
    const formData = new FormData();
    if (typeof fileOrText === "string") {
      formData.append("raw", fileOrText);
    } else {
      formData.append("file", fileOrText);
    }

    const res = await fetch("/api/parse-cv", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al procesar el archivo");
    }

    const data = await res.json();
    if (!data.profile) {
      throw new Error("No se pudo estructurar el perfil del CV");
    }

    const parsedProfile: Profile = data.profile;
    setState((s) => ({ ...s, profile: parsedProfile }));
    return parsedProfile;
  }, []);

  const value = useMemo<DeckValue>(() => {
    const get = (id: string | null | undefined) =>
      id ? state.vacancies.find((v) => v.id === id) : undefined;
    return {
      ...state,
      get,
      updateVacancy,
      setProfile,
      resetProfile,
      parseAndSetProfile,
      adaptFromRaw: async (raw: string) => {
        let a: ReturnType<typeof adaptCV>;
        try {
          const res = await fetch("/api/adapt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raw, profile: state.profile }),
          });
          if (!res.ok) throw new Error(String(res.status));
          a = await res.json();
        } catch {
          a = adaptCV(raw, state.profile);
        }
        const v: Vacancy = {
          id: newId("vac"),
          raw: raw.trim(),
          createdAt: new Date().toISOString(),
          status: "adaptada",
          ...a,
        };
        setState((s) => ({ ...s, vacancies: [v, ...s.vacancies] }));
        return v;
      },
      markSent: (id: string) =>
        updateVacancy(id, { status: "postulada", sentAt: new Date().toISOString() }),
      removeVacancy: (id: string) =>
        setState((s) => ({ ...s, vacancies: s.vacancies.filter((v) => v.id !== id) })),
    };
  }, [state, updateVacancy, setProfile, resetProfile, parseAndSetProfile]);

  return <DeckCtx.Provider value={value}>{children}</DeckCtx.Provider>;
}

export function useDeck(): DeckValue {
  const ctx = useContext(DeckCtx);
  if (!ctx) throw new Error("useDeck must be used inside <DeckProvider>");
  return ctx;
}

// ─── Toast ──────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  msg: string;
  tone: "info" | "ok";
}
const ToastCtx = createContext<(msg: string, tone?: "info" | "ok") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string, tone: "info" | "ok" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass reveal pointer-events-auto flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] text-ink-hi"
          >
            <span className={`h-1.5 w-1.5 rotate-45 ${t.tone === "ok" ? "bg-depth" : "bg-brass"}`} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

export type { VacancyStatus };
