"use client";

/**
 * @file PipelineBoard.tsx
 * @description Kanban view of the application pipeline. Native HTML5 drag between
 * columns; a per-card <select> does the same move for touch / keyboard. Each card
 * holds a free-text prep-notes field (autosaves on blur).
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, GripVertical, StickyNote, Trash2 } from "lucide-react";
import {
  STATUS_ORDER,
  STATUS_LABEL,
  VacancyStatus,
  Vacancy,
  calceScore,
} from "@/lib/atlas/mock";
import { useDeck, useToast } from "@/lib/atlas/store";
import { CalceGauge } from "@/components/atlas/bits";

// Column accent — reuses the StatusBadge hues (see bits.tsx STATUS_TONE).
const ACCENT: Record<VacancyStatus, string> = {
  adaptada: "#F0C24C",
  postulada: "#6BA8C4",
  entrevista: "#9AD0E6",
  respuesta: "#D8B968",
  descartada: "#DB7C68",
};

export function PipelineBoard({ vacancies }: { vacancies: Vacancy[] }) {
  const { updateVacancy, removeVacancy } = useDeck();
  const toast = useToast();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<VacancyStatus | null>(null);

  function move(id: string, to: VacancyStatus) {
    const v = vacancies.find((x) => x.id === id);
    if (!v || v.status === to) return;
    updateVacancy(id, { status: to });
    toast(`→ ${STATUS_LABEL[to]}`, "ok");
  }

  return (
    <div
      className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-4 overflow-x-auto pb-4 xl:auto-cols-fr xl:overflow-x-visible xl:pb-0"
    >
      {STATUS_ORDER.map((status) => {
        const cards = vacancies.filter((v) => v.status === status);
        const isOver = overCol === status && dragId !== null;
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverCol(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, status);
              setOverCol(null);
              setDragId(null);
            }}
            className={`flex min-w-0 flex-col rounded-2xl border p-1.5 transition-colors ${
              isOver
                ? "border-dashed border-brass/60 bg-brass/[0.04]"
                : "border-[rgba(255,235,190,0.06)] bg-[rgba(0,0,0,0.18)]"
            }`}
          >
            <header className="flex items-center gap-2 px-2.5 pb-2 pt-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ACCENT[status] }}
              />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-mid">
                {STATUS_LABEL[status]}
              </span>
              <span className="tabular ml-auto rounded-full bg-[rgba(255,235,190,0.06)] px-1.5 py-0.5 font-mono text-[10px] text-ink-lo">
                {cards.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 px-0.5 pb-1">
              {cards.map((v) => (
                <PipelineCard
                  key={`${v.id}:${v.status}`}
                  v={v}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", v.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(v.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  dragging={dragId === v.id}
                  onMove={(to) => move(v.id, to)}
                  onSaveNotes={(notes) => updateVacancy(v.id, { notes })}
                  onRemove={() => {
                    removeVacancy(v.id);
                    toast("Eliminada");
                  }}
                />
              ))}
              {cards.length === 0 && (
                <p className="px-1 py-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-lo/50">
                  Vacía
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PipelineCard({
  v,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onSaveNotes,
  onRemove,
}: {
  v: Vacancy;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (to: VacancyStatus) => void;
  onSaveNotes: (notes: string) => void;
  onRemove: () => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(v.notes ?? "");
  const hasNotes = (v.notes ?? "").trim().length > 0;

  return (
    <article
      // ponytail: whole card is the drag handle; disabled while notes are open so
      //           text selection in the textarea works. Good enough for one field.
      draggable={!notesOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`card reveal card-hover rounded-xl p-3 ${
        notesOpen ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,235,190,0.1)] bg-chart-raised font-display text-[13px] font-semibold text-brass-soft">
          {v.company.trim().charAt(0).toUpperCase() || "·"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-snug text-ink-hi">
            {v.title}
          </p>
          <p className="truncate text-[11.5px] text-ink-mid">{v.company}</p>
        </div>
        <GripVertical
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-lo/50 ${notesOpen ? "invisible" : ""}`}
        />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <CalceGauge value={calceScore(v)} size={30} />
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-lo transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-mid"
        >
          <StickyNote className="h-3 w-3" />
          Notas
          {hasNotes && <span className="h-1.5 w-1.5 rounded-full bg-brass" />}
        </button>
        <Link
          href={`/adaptar?v=${v.id}`}
          className="ml-auto flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-lo transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-hi"
        >
          Abrir <ArrowUpRight className="h-3 w-3" />
        </Link>
        <button
          onClick={onRemove}
          className="rounded-md p-1 text-ink-lo/60 transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-caution"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {notesOpen && (
        <div className="mt-2.5">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== (v.notes ?? "")) onSaveNotes(draft);
            }}
            rows={4}
            placeholder="Apuntes, fechas clave, preguntas para la entrevista…"
            className="well w-full resize-y rounded-lg px-2.5 py-2 text-[12px] leading-relaxed text-ink-hi outline-none placeholder:text-ink-lo focus:border-brass/30"
          />
        </div>
      )}

      {/* Move fallback for touch / keyboard — HTML5 drag doesn't fire on touch. */}
      <label className="mt-1.5 flex items-center gap-1.5 rounded-md border border-transparent px-1 py-0.5 text-ink-lo transition-colors focus-within:border-brass/30 hover:text-ink-mid">
        <ArrowLeftRight className="h-3 w-3 shrink-0" />
        <select
          value={v.status}
          onChange={(e) => onMove(e.target.value as VacancyStatus)}
          aria-label="Mover a otra fase"
          className="flex-1 cursor-pointer appearance-none bg-transparent py-0.5 text-[11px] text-inherit outline-none"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} className="bg-chart-surface text-ink-hi">
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
