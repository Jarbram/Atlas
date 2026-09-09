"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles, FileEdit, BarChart3, Send, Search } from "lucide-react";
import { calceScore, isActive } from "@/lib/atlas/mock";
import { useDeck } from "@/lib/atlas/store";
import { PageHeader, StatCard, Sparkline } from "@/components/atlas/bits";
import { PipelineBoard } from "@/components/atlas/PipelineBoard";

export default function HistorialPage() {
  const { vacancies } = useDeck();
  const [q, setQ] = useState("");

  const activas = vacancies.filter((v) => isActive(v.status)).length;
  const avgCalce = vacancies.length
    ? Math.round(vacancies.reduce((s, v) => s + calceScore(v), 0) / vacancies.length)
    : 0;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vacancies;
    return vacancies.filter(
      (v) =>
        v.title.toLowerCase().includes(term) || v.company.toLowerCase().includes(term),
    );
  }, [vacancies, q]);

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
        title="Tablero de postulaciones"
        description="Arrastra cada vacante por las fases del proceso. Abre las notas de una tarjeta para apuntes, fechas clave y preguntas para la entrevista."
      />

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
                  background: i < Math.min(4, activas) ? "#DB7C68" : "rgba(255,235,190,0.08)",
                }}
              />
            ))}
          </div>
        </StatCard>
      </div>

      <div className="mb-4 mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-ink-hi">
          Pipeline
        </h2>
        <div className="well flex items-center gap-2 rounded-lg px-3 py-2">
          <Search className="h-3.5 w-3.5 text-ink-lo" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar rol o empresa…"
            className="w-40 bg-transparent text-[12px] text-ink-hi outline-none placeholder:text-ink-lo sm:w-56"
          />
        </div>
      </div>

      <PipelineBoard vacancies={shown} />
    </div>
  );
}
