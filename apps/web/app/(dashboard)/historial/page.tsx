"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Trash2,
  Sparkles,
  FileEdit,
  BarChart3,
  Send,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { VacancyStatus, calceScore, isActive } from "@/lib/atlas/mock";
import { useDeck, useToast } from "@/lib/atlas/store";
import { StatusBadge, PageHeader, StatCard, CalceGauge, Sparkline } from "@/components/atlas/bits";

const FILTERS: { id: "todas" | VacancyStatus; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "adaptada", label: "Adaptadas" },
  { id: "postulada", label: "Postuladas" },
  { id: "entrevista", label: "Entrevista" },
  { id: "descartada", label: "Descartadas" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HistorialPage() {
  const { vacancies, removeVacancy } = useDeck();
  const toast = useToast();
  const [filter, setFilter] = useState<"todas" | VacancyStatus>("todas");
  const [q, setQ] = useState("");

  const activas = vacancies.filter((v) => isActive(v.status)).length;
  const avgCalce = vacancies.length
    ? Math.round(vacancies.reduce((s, v) => s + calceScore(v), 0) / vacancies.length)
    : 0;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vacancies.filter(
      (v) =>
        (filter === "todas" || v.status === filter) &&
        (!term ||
          v.title.toLowerCase().includes(term) ||
          v.company.toLowerCase().includes(term)),
    );
  }, [vacancies, filter, q]);

  if (vacancies.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-6">
        <div className="card reveal max-w-sm space-y-4 rounded-2xl p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-brass/70" />
          <h2 className="font-display text-[18px] font-semibold text-ink-hi">
            Aún no has adaptado ninguna vacante
          </h2>
          <p className="text-[13px] text-ink-mid">
            Pega una oferta y el motor te arma el CV y el mensaje. Aparecerán todas aquí.
          </p>
          <Link
            href="/adaptar"
            className="inline-flex items-center gap-2 rounded-full bg-brass px-4 py-2.5 text-[13px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft"
          >
            Adaptar una vacante <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        title="Historial de aplicaciones"
        description="Revisa y gestiona tu historial de vacantes, adaptaciones de CV y nivel de calce para cada oportunidad laboral."
      />

      {/* stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total adaptaciones"
          icon={<FileEdit className="h-4 w-4" />}
          value={vacancies.length}
          sub="registradas"
        >
          <Sparkline points={[0.4, 0.35, 0.55, 0.45, 0.6, 0.5, 0.72, 0.62, 0.8]} />
        </StatCard>

        <StatCard
          label="Calce promedio"
          icon={<BarChart3 className="h-4 w-4" />}
          value={`${avgCalce}%`}
          sub="objetivo: 85%"
        >
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,235,190,0.08)]">
            <div className="h-full rounded-full bg-depth" style={{ width: `${avgCalce}%` }} />
          </div>
        </StatCard>

        <StatCard
          label="Postulaciones activas"
          icon={<Send className="h-4 w-4" />}
          value={activas}
          sub="en proceso"
        >
          <div className="mt-1 flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background:
                    i < Math.min(4, activas) ? "#DB7C68" : "rgba(255,235,190,0.08)",
                }}
              />
            ))}
          </div>
        </StatCard>
      </div>

      {/* register */}
      <div className="card mt-6 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(255,235,190,0.07)] p-5">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink-hi">
            Registro de postulaciones
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="well flex items-center gap-2 rounded-lg px-3 py-2">
              <Search className="h-3.5 w-3.5 text-ink-lo" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar rol o empresa…"
                className="w-40 bg-transparent text-[12px] text-ink-hi outline-none placeholder:text-ink-lo sm:w-56"
              />
            </div>
            <button
              onClick={() => setFilter("todas")}
              className="well card-hover flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-ink-mid hover:text-ink-hi"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Limpiar
            </button>
          </div>
        </div>

        {/* filter chips */}
        <div className="flex flex-wrap gap-1.5 px-5 pt-4">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                filter === f.id
                  ? "bg-brass/15 text-brass-soft"
                  : "text-ink-lo hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-mid"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* table */}
        <div className="overflow-x-auto px-2 pb-2 pt-3">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-ink-lo">
                <th className="px-3 py-2 font-medium">Rol &amp; empresa</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Calce</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr
                  key={v.id}
                  className="group border-t border-[rgba(255,235,190,0.06)] transition-colors hover:bg-[rgba(255,235,190,0.03)]"
                >
                  <td className="px-3 py-3.5">
                    <Link href={`/adaptar?v=${v.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,235,190,0.1)] bg-chart-raised font-display text-[13px] font-semibold text-brass-soft">
                        {v.company.trim().charAt(0).toUpperCase() || "·"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-ink-hi">
                          {v.title}
                        </span>
                        <span className="block truncate text-[12px] text-ink-mid">{v.company}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-3.5 font-mono text-[12px] text-ink-mid">
                    {fmtDate(v.createdAt)}
                  </td>
                  <td className="px-3 py-3.5">
                    <CalceGauge value={calceScore(v)} size={40} />
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/adaptar?v=${v.id}`}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-lo transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-hi"
                      >
                        Abrir
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                      <button
                        onClick={() => {
                          removeVacancy(v.id);
                          toast("Eliminada");
                        }}
                        className="rounded-lg p-1.5 text-ink-lo/70 transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-caution"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <p className="px-4 py-10 text-center text-[12px] text-ink-lo">
              Nada coincide con este filtro.
            </p>
          )}
        </div>

        <div className="border-t border-[rgba(255,235,190,0.07)] px-5 py-3.5">
          <span className="tabular font-mono text-[11px] text-ink-lo">
            Mostrando {shown.length} de {vacancies.length} resultados
          </span>
        </div>
      </div>
    </div>
  );
}
