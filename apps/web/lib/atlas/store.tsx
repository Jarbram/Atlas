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

/** Coerce an arbitrary stored/fetched shape into a safe Persisted. */
function normalize(p: { vacancies?: unknown; profile?: unknown } | null | undefined): Persisted {
  return {
    vacancies: Array.isArray(p?.vacancies) ? (p!.vacancies as Vacancy[]) : [],
    // Merge over EMPTY_PROFILE so a partial/corrupt shape can't crash the UI.
    profile: { ...EMPTY_PROFILE, ...((p?.profile as Partial<Profile>) ?? {}) },
  };
}

function read(): Persisted {
  if (typeof window === "undefined") return { vacancies: [], profile: EMPTY_PROFILE };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : { vacancies: [], profile: EMPTY_PROFILE };
  } catch {
    return { vacancies: [], profile: EMPTY_PROFILE };
  }
}

interface DeckValue extends Persisted {
  hydrated: boolean;
  get: (id: string | null | undefined) => Vacancy | undefined;
  adaptFromRaw: (raw: string) => Promise<Vacancy>;
  /** Re-run the AI adaptation for an existing vacancy (e.g. after adding a gap skill). */
  readaptVacancy: (id: string, profileOverride?: Profile) => Promise<void>;
  updateVacancy: (id: string, patch: Partial<Vacancy>) => void;
  markSent: (id: string) => void;
  removeVacancy: (id: string) => void;
  setProfile: (profile: Profile) => void;
  resetProfile: () => void;
  parseAndSetProfile: (fileOrText: File | string) => Promise<Profile>;
}

/** Call the adapt API, falling back to the local heuristic if it fails. */
async function runAdapt(raw: string, profile: Profile): Promise<ReturnType<typeof adaptCV>> {
  try {
    const res = await fetch("/api/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, profile }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return adaptCV(raw, profile);
  }
}

const DeckCtx = createContext<DeckValue | null>(null);

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>({ vacancies: [], profile: EMPTY_PROFILE });
  const [hydrated, setHydrated] = useState(false);
  // Supabase user id once known — gates the cloud sync. Null = anon, local-only.
  const uidRef = React.useRef<string | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let next = read();

      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (user) {
          uidRef.current = user.id;
          const { data: row } = await supabase
            .from("atlas_state")
            .select("data")
            .eq("user_id", user.id)
            .maybeSingle();

          // ponytail: account is source of truth on login — the remote blob wins
          //           whole, no field-level merge. Add a CRDT only if concurrent
          //           multi-device edits become a real complaint.
          if (row?.data) {
            next = normalize(row.data as Persisted);
          } else if (!next.profile.name && !next.profile.email) {
            next.profile = {
              ...next.profile,
              name: (user.user_metadata?.full_name as string) || "",
              email: user.email || "",
            };
          }
        }
      }

      if (!cancelled) {
        setState(next);
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota */
    }

    // Debounced push to Supabase so a burst of edits is one round-trip.
    if (!uidRef.current || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        await supabase
          .from("atlas_state")
          .upsert({ user_id: uidRef.current, data: state, updated_at: new Date().toISOString() });
      } catch {
        /* offline — localStorage still holds it, next edit retries */
      }
    }, 800);
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
    if (uidRef.current && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient();
      supabase
        .from("atlas_state")
        .delete()
        .eq("user_id", uidRef.current)
        .then(undefined, () => {});
    }
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

    const parsedProfile: Profile = { ...EMPTY_PROFILE, ...data.profile };
    setState((s) => ({ ...s, profile: parsedProfile }));
    return parsedProfile;
  }, []);

  const value = useMemo<DeckValue>(() => {
    const get = (id: string | null | undefined) =>
      id ? state.vacancies.find((v) => v.id === id) : undefined;
    return {
      ...state,
      hydrated,
      get,
      updateVacancy,
      setProfile,
      resetProfile,
      parseAndSetProfile,
      adaptFromRaw: async (raw: string) => {
        const a = await runAdapt(raw, state.profile);
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
      readaptVacancy: async (id: string, profileOverride?: Profile) => {
        const target = state.vacancies.find((v) => v.id === id);
        if (!target) return;
        const a = await runAdapt(target.raw, profileOverride ?? state.profile);
        // Keep vacancy identity/status; refresh only what the adaptation produces.
        setState((s) => ({
          ...s,
          vacancies: s.vacancies.map((v) =>
            v.id === id
              ? {
                  ...v,
                  matched: a.matched,
                  gaps: a.gaps,
                  experienceIds: a.experienceIds,
                  tailoredExperiences: a.tailoredExperiences,
                  summaryLine: a.summaryLine,
                  message: a.message,
                }
              : v,
          ),
        }));
      },
      markSent: (id: string) =>
        updateVacancy(id, { status: "postulada", sentAt: new Date().toISOString() }),
      removeVacancy: (id: string) =>
        setState((s) => ({ ...s, vacancies: s.vacancies.filter((v) => v.id !== id) })),
    };
  }, [state, hydrated, updateVacancy, setProfile, resetProfile, parseAndSetProfile]);

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
