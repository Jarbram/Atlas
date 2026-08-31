"use client";

/**
 * @file store.tsx
 * @description Client session state: the vacancies the user has adapted (each
 * with its recruiter message + status) and the editable profile. Persisted to
 * localStorage. Plus a toast channel.
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
  SEED_PROFILE,
  Vacancy,
  VacancyStatus,
  adaptCV,
  newId,
  seedVacancies,
} from "./mock";

const KEY = "atlas.deck.v4";

interface Persisted {
  vacancies: Vacancy[];
  profile: Profile;
}

function read(): Persisted {
  const fresh = { vacancies: seedVacancies(), profile: SEED_PROFILE };
  if (typeof window === "undefined") return { vacancies: [], profile: SEED_PROFILE };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh;
    const p = JSON.parse(raw);
    return {
      vacancies: Array.isArray(p.vacancies) ? p.vacancies : [],
      profile: p.profile ?? SEED_PROFILE,
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
}

const DeckCtx = createContext<DeckValue | null>(null);

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>({ vacancies: [], profile: SEED_PROFILE });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — session-only is fine */
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

  const value = useMemo<DeckValue>(() => {
    const get = (id: string | null | undefined) =>
      id ? state.vacancies.find((v) => v.id === id) : undefined;
    return {
      ...state,
      get,
      updateVacancy,
      adaptFromRaw: async (raw: string) => {
        // Try the server (DeepSeek); fall back to the local heuristic offline / on error.
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
      setProfile: (profile: Profile) => setState((s) => ({ ...s, profile })),
    };
  }, [state, updateVacancy]);

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
