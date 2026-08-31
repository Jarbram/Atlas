"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, FileText, Plus, Search, CornerDownLeft } from "lucide-react";
import { MODULES } from "@/lib/atlas/mock";
import { useDeck } from "@/lib/atlas/store";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { vacancies } = useDeck();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = MODULES.map((m) => ({
      id: `nav-${m.slug}`,
      label: `Ir a ${m.label}`,
      hint: m.hint,
      group: "Navegar",
      run: () => router.push(`/${m.slug}`),
    }));
    const actions: Cmd[] = [
      {
        id: "new",
        label: "Nueva vacante",
        hint: "Pegar y adaptar",
        group: "Acciones",
        run: () => router.push("/adaptar"),
      },
    ];
    const vacs: Cmd[] = vacancies.map((v) => ({
      id: `vac-${v.id}`,
      label: v.title,
      hint: v.company,
      group: "Historial",
      run: () => router.push(`/adaptar?v=${v.id}`),
    }));
    return [...nav, ...actions, ...vacs];
  }, [router, vacancies]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(term) ||
        c.hint?.toLowerCase().includes(term) ||
        c.group.toLowerCase().includes(term),
    );
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const choose = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const groups = results.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});
  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        className="glass reveal w-full max-w-xl overflow-hidden rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
      >
        <div className="flex items-center gap-2.5 border-b border-[rgba(255,235,190,0.08)] px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-lo" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(active);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Buscar módulos, vacantes, acciones…"
            className="h-12 w-full bg-transparent text-[14px] text-ink-hi outline-none placeholder:text-ink-lo"
          />
          <kbd className="hidden shrink-0 rounded border border-[rgba(255,235,190,0.12)] px-1.5 py-0.5 font-mono text-[10px] text-ink-lo sm:block">
            esc
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-ink-lo">Sin resultados</p>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-4 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-ink-lo">
                {group}
              </p>
              {items.map((c) => {
                flatIndex++;
                const i = flatIndex;
                const isActive = i === active;
                const Icon =
                  c.group === "Navegar" ? Compass : c.group === "Acciones" ? Plus : FileText;
                return (
                  <button
                    key={c.id}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] ${
                      isActive ? "bg-[rgba(255,235,190,0.06)] text-ink-hi" : "text-ink-mid"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brass" : "text-ink-lo"}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="truncate text-[11px] text-ink-lo">{c.hint}</span>}
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-lo" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
