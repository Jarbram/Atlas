"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Copy,
  Download,
  Trash2,
  Check,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Pencil,
  ClipboardPaste,
  FileUp,
  ScanSearch,
  GitCompareArrows,
  ListOrdered,
  Mail,
  FileEdit,
  Sparkles,
} from "lucide-react";
import { Profile, Vacancy, calceScore, isProfileEmpty, newId } from "@/lib/atlas/mock";
import { useDeck, useToast } from "@/lib/atlas/store";
import { Eyebrow, StatusBadge, PageHeader, CalceGauge } from "@/components/atlas/bits";

const STEPS = [
  { icon: FileEdit, tag: "Paso 01", title: "Entrada de vacante", desc: "Recepción y limpieza del texto original para análisis." },
  { icon: ScanSearch, tag: "Paso 02", title: "Extracción de habilidades", desc: "Identificación de hard skills, soft skills y requisitos clave." },
  { icon: GitCompareArrows, tag: "Paso 03", title: "Cruce de perfil", desc: "Comparación de requerimientos contra tu historial profesional." },
  { icon: ListOrdered, tag: "Paso 04", title: "Priorización de impacto", desc: "Ordenamiento de competencias según relevancia para el puesto." },
  { icon: Mail, tag: "Paso 05", title: "Generación de mensaje", desc: "Creación de pitch adaptado y resumen ejecutivo final." },
];

function pickedExperiences(p: Profile, v: Vacancy) {
  const byId = new Map((p.experiences || []).map((e) => [e.id, e]));
  const chosen = v.experienceIds.map((id) => byId.get(id)).filter(Boolean) as Profile["experiences"];
  return chosen.length ? chosen : (p.experiences || []).slice(0, 3);
}

function cvPlainText(p: Profile, v: Vacancy) {
  const exps = pickedExperiences(p, v);
  return [
    (p.name || "CANDIDATO").toUpperCase(),
    [p.location, p.phone, p.email, ...p.links].filter(Boolean).join(" · "),
    "",
    "RESUMEN PROFESIONAL",
    `${p.summary} ${v.summaryLine}`.trim(),
    "",
    "EXPERIENCIA",
    ...exps.flatMap((e) => [
      `${e.company} — ${e.role} (${e.period})`,
      ...e.bullets.map((b) => `• ${b}`),
      "",
    ]),
    "EDUCACIÓN Y CERTIFICACIONES",
    ...(p.education || []).map((e) => `${e.title} — ${e.org} (${e.period})`),
    "",
    "IDIOMAS",
    ...(p.languages || []).map((l) => `${l.name}: ${l.level}`),
  ].join("\n");
}

export default function AdaptarPage() {
  const { get, adaptFromRaw, profile } = useDeck();
  const toast = useToast();

  const [vid, setVid] = useState<string | null>(null);
  const [mode, setMode] = useState<"texto" | "pdf">("texto");
  const [raw, setRaw] = useState("");
  const [running, setRunning] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setVid(new URLSearchParams(window.location.search).get("v"));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const vacancy = get(vid);
  const chars = raw.trim().length;

  const openResult = (id: string) => {
    setVid(id);
    window.history.pushState(null, "", `/adaptar?v=${id}`);
  };

  const handleVacancyPdfUpload = async (file: File) => {
    if (!file) return;
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("No se pudo leer el archivo");
      const data = await res.json();
      // If parsed, create a raw representation
      if (data.profile) {
        const p = data.profile;
        const text = [
          `${p.company || p.title || "Vacante"}\n`,
          p.summary,
          "\nRequisitos y responsabilidades:",
          ...p.experiences.flatMap((e: any) => e.bullets),
          ...p.skills.flatMap((s: any) => s.items),
        ].filter(Boolean).join("\n");
        setRaw(text);
      }
      setMode("texto");
      toast("Texto de la vacante extraído", "ok");
    } catch (err: any) {
      toast(err.message || "Error al leer el PDF de la vacante");
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const run = async () => {
    if (chars < 40 || running) return;

    if (isProfileEmpty(profile)) {
      toast("Te recomendamos cargar tu CV primero en 'Mi información' para un mejor resultado", "info");
    }

    setRunning(true);
    setActiveStep(0);
    const timers = [1, 2, 3, 4].map((s) => setTimeout(() => setActiveStep(s), s * 340));
    try {
      const [v] = await Promise.all([
        adaptFromRaw(raw),
        new Promise((r) => setTimeout(r, 1600)),
      ]);
      setRaw("");
      openResult(v.id);
    } finally {
      timers.forEach(clearTimeout);
      setRunning(false);
      setActiveStep(-1);
    }
  };

  if (vacancy) return <Result vacancy={vacancy} profile={profile} />;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleVacancyPdfUpload(f);
        }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.75fr_1fr]">
        {/* left — console */}
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight text-brass sm:text-[40px]">
            Adaptar vacante
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-mid">
            Pega la descripción completa de la vacante o sube su archivo PDF para iniciar el análisis.
            El sistema extrae las habilidades clave, las cruza con tu perfil y genera un CV optimizado y el mensaje para el reclutador.
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="well inline-flex rounded-full p-1">
              {(["texto", "pdf"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === "pdf") {
                      pdfInputRef.current?.click();
                    }
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    mode === m ? "bg-brass/15 text-brass-soft" : "text-ink-lo hover:text-ink-mid"
                  }`}
                >
                  {m === "texto" ? (
                    <ClipboardPaste className="h-3.5 w-3.5" />
                  ) : (
                    <FileUp className="h-3.5 w-3.5" />
                  )}
                  {m === "texto" ? "Pegar texto" : "Subir PDF de la vacante"}
                </button>
              ))}
            </div>
          </div>

          {/* terminal */}
          <div className="card mt-4 overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,235,190,0.07)] px-4 py-3">
              <div className="flex items-center gap-1.5">
                {["#5c4a2e", "#5c4a2e", "#5c4a2e"].map((c, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-lo">
                {pdfUploading ? "Procesando documento..." : "Entrada de texto"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => raw && (navigator.clipboard?.writeText(raw), toast("Copiado", "ok"))}
                  className="rounded-md p-1.5 text-ink-lo transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-mid"
                  aria-label="Copiar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRaw("")}
                  className="rounded-md p-1.5 text-ink-lo transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-caution"
                  aria-label="Limpiar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {pdfUploading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-brass" />
                <p className="mt-3 text-[14px] font-medium text-ink-hi">Leyendo PDF de la vacante…</p>
                <p className="text-[12px] text-ink-lo">Extrayendo requerimientos y responsabilidades</p>
              </div>
            ) : (
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                disabled={running}
                rows={18}
                placeholder={
                  "Pega aquí la descripción detallada de la vacante…\n\nSe recomienda incluir:\n– Responsabilidades del cargo\n– Requisitos técnicos y habilidades blandas\n– Tecnologías o herramientas requeridas\n– Años de experiencia solicitados"
                }
                className="w-full resize-y bg-transparent p-5 text-[13px] leading-relaxed text-ink-hi outline-none placeholder:text-ink-lo/70 disabled:opacity-60"
              />
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[rgba(255,235,190,0.07)] px-4 py-3">
              <span className="well tabular rounded-md px-2 py-1 font-mono text-[11px] text-ink-mid">
                {chars} caracteres
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-lo">
                ⓘ Mín. 500 recomendado
              </span>
              <button
                onClick={run}
                disabled={chars < 40 || running}
                className="ml-auto flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft disabled:opacity-50"
              >
                {running ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analizando…
                  </>
                ) : (
                  <>
                    Continuar análisis <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* right — flow */}
        <aside className="lg:pl-2">
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-ink-hi">
            Flujo de análisis
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
            El sistema procesa la vacante en 5 etapas.
          </p>

          <ol className="relative mt-6 space-y-6 border-l border-[rgba(255,235,190,0.1)] pl-7">
            {STEPS.map((s, i) => {
              const on = activeStep >= i;
              const now = activeStep === i;
              const Icon = s.icon;
              return (
                <li key={s.tag} className="relative">
                  <span
                    className={`absolute -left-[41px] flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                      now
                        ? "border-brass bg-brass/15 text-brass"
                        : on
                          ? "border-brass/40 bg-brass/10 text-brass-soft"
                          : "border-[rgba(255,235,190,0.12)] bg-chart-surface text-ink-lo"
                    } ${now ? "ring-4 ring-brass/15" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p
                    className={`font-mono text-[10px] font-medium uppercase tracking-[0.16em] ${
                      on ? "text-brass" : "text-ink-lo"
                    }`}
                  >
                    {s.tag}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-ink-hi">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mid">{s.desc}</p>
                </li>
              );
            })}
          </ol>

          <div
            className="card mt-7 flex items-end rounded-2xl p-4"
            style={{
              minHeight: 120,
              backgroundImage:
                "radial-gradient(1px 1px at 20% 30%, rgba(255,235,190,0.5), transparent), radial-gradient(1px 1px at 62% 68%, rgba(255,235,190,0.35), transparent), radial-gradient(1.5px 1.5px at 82% 24%, rgba(240,194,76,0.5), transparent), radial-gradient(1px 1px at 40% 82%, rgba(255,235,190,0.3), transparent), linear-gradient(180deg, #120d08, #0d0a07)",
            }}
          >
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-lo">
              {running ? "Motor de inferencia · procesando" : "Motor de inferencia listo"}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Result({ vacancy, profile }: { vacancy: Vacancy; profile: Profile }) {
  const { updateVacancy, markSent, setProfile } = useDeck();
  const toast = useToast();
  const exps = useMemo(() => pickedExperiences(profile, vacancy), [profile, vacancy]);
  const calce = useMemo(() => calceScore(vacancy), [vacancy]);
  const [showRaw, setShowRaw] = useState(false);
  const [gapDraft, setGapDraft] = useState<{ name: string; note: string } | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast(`${label} copiado`, "ok");
  };

  const downloadPdf = async () => {
    try {
      const { downloadCvPdf } = await import("@/lib/atlas/cv-pdf");
      await downloadCvPdf(
        `CV - ${profile.name || "Candidato"} - ${vacancy.company}`,
        cvPlainText(profile, vacancy),
      );
    } catch {
      toast("No se pudo generar el PDF");
    }
  };

  const saveGap = () => {
    if (!gapDraft) return;
    const name = gapDraft.name;
    setProfile({
      ...profile,
      addedSkills: [
        ...(profile.addedSkills ?? []),
        { id: newId("as"), name, note: gapDraft.note.trim() },
      ],
    });
    updateVacancy(vacancy.id, {
      gaps: vacancy.gaps.filter((x) => x !== name),
      matched: [...vacancy.matched, name],
    });
    setGapDraft(null);
    toast(`${name} agregada a tu información`, "ok");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
      <Link
        href="/historial"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-mid hover:text-ink-hi"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Historial
      </Link>

      <div className="reveal mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Eyebrow>Vacante adaptada</Eyebrow>
          <div className="group mt-2 flex items-center gap-2">
            <input
              value={vacancy.title}
              onChange={(e) => updateVacancy(vacancy.id, { title: e.target.value })}
              title="Editar título"
              className="w-full min-w-0 rounded-md border-b border-dashed border-transparent bg-transparent font-display text-[26px] font-semibold tracking-tight text-ink-hi outline-none hover:border-chart-line-strong focus:border-brass/70"
            />
            <Pencil className="h-3.5 w-3.5 shrink-0 text-ink-lo opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <input
              value={vacancy.company}
              onChange={(e) => updateVacancy(vacancy.id, { company: e.target.value })}
              title="Editar empresa"
              className="rounded-md border-b border-dashed border-transparent bg-transparent text-[14px] text-ink-mid outline-none hover:border-chart-line-strong focus:border-brass/70"
            />
            <StatusBadge status={vacancy.status} />
            <span className="tabular font-mono text-[11px] text-ink-lo">
              {new Date(vacancy.createdAt).toLocaleDateString("es")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[rgba(255,235,190,0.08)] bg-chart-surface px-4 py-3">
          <CalceGauge value={calce} size={52} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-lo">Calce</p>
            <p className="text-[12px] text-ink-mid">
              {vacancy.matched.length}/{vacancy.matched.length + vacancy.gaps.length} tecnologías
            </p>
          </div>
        </div>
      </div>

      {/* analysis */}
      <div className="reveal-2 card mb-6 grid grid-cols-1 gap-x-8 gap-y-5 rounded-2xl p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-medium text-depth">
            <CheckCircle2 className="h-4 w-4" /> De tu perfil que la vacante pide
            <span className="tabular font-mono text-ink-lo">· {vacancy.matched.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vacancy.matched.length ? (
              vacancy.matched.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-depth/30 bg-depth/12 px-2.5 py-1 font-mono text-[12px] text-depth"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-ink-lo">Sin coincidencias explícitas</span>
            )}
          </div>
        </div>
        <div className="sm:border-l sm:border-[rgba(255,235,190,0.08)] sm:pl-8">
          <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-medium text-caution">
            <AlertTriangle className="h-4 w-4" /> Pide y no está en tu información
            <span className="tabular font-mono text-ink-lo">· {vacancy.gaps.length}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vacancy.gaps.length ? (
              vacancy.gaps.map((s) => (
                <button
                  key={s}
                  onClick={() => setGapDraft({ name: s, note: "" })}
                  title="Agregar a mi información"
                  className={`rounded-md border px-2.5 py-1 font-mono text-[12px] transition-colors ${
                    gapDraft?.name === s
                      ? "border-brass bg-brass/15 text-brass-soft"
                      : "border-caution/30 bg-caution/12 text-caution hover:bg-caution/20"
                  }`}
                >
                  {s} +
                </button>
              ))
            ) : (
              <span className="text-[12px] text-ink-lo">Ningún gap evidente</span>
            )}
          </div>

          {gapDraft && (
            <div className="well mt-3 space-y-2 rounded-lg p-3">
              <p className="text-[12px] font-medium text-ink-hi">
                Agregar <span className="font-mono text-brass-soft">{gapDraft.name}</span> a tu información
              </p>
              <textarea
                autoFocus
                value={gapDraft.note}
                onChange={(e) => setGapDraft({ ...gapDraft, note: e.target.value })}
                rows={3}
                placeholder="¿Cómo la usaste? Proyecto, resultado, contexto…"
                className="w-full resize-y rounded-md bg-transparent p-2 text-[12px] leading-relaxed text-ink-hi outline-none ring-1 ring-[rgba(255,235,190,0.1)] focus:ring-brass/50"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveGap}
                  className="rounded-full bg-brass px-3 py-1.5 text-[12px] font-semibold text-[#1a1305] hover:bg-brass-soft"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setGapDraft(null)}
                  className="text-[12px] text-ink-lo hover:text-ink-mid"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <Link
            href="/perfil"
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-brass-soft hover:underline"
          >
            Ver mi información <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="reveal-3 grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-7">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-mid">
              CV adaptado
              <span className="ml-2 text-[12px] text-ink-lo">
                {exps.length} experiencia{exps.length === 1 ? "" : "s"} priorizada
                {exps.length === 1 ? "" : "s"}
              </span>
            </span>
            <button
              onClick={downloadPdf}
              className="well card-hover flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-mid hover:text-ink-hi"
            >
              <Download className="h-3 w-3" /> Descargar CV en PDF
            </button>
          </div>
          <div className="space-y-4 rounded-lg bg-[#FBFAF6] p-6 font-serif text-black shadow-[0_2px_10px_rgba(0,0,0,0.4),0_36px_70px_-28px_rgba(0,0,0,0.85)] ring-1 ring-black/5 sm:p-8">
            <div className="border-b border-black/80 pb-3 text-center">
              <h1 className="text-xl font-bold uppercase tracking-wide">{profile.name || "CANDIDATO"}</h1>
              <p className="mt-1 font-sans text-[11px] text-gray-700">
                {[profile.location, profile.phone, profile.email, ...profile.links]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div>
              <h2 className="border-b border-black/80 pb-0.5 font-sans text-[11px] font-bold uppercase tracking-wider">
                Resumen profesional
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-800">
                {profile.summary} <em>{vacancy.summaryLine}</em>
              </p>
            </div>
            <div>
              <h2 className="border-b border-black/80 pb-0.5 font-sans text-[11px] font-bold uppercase tracking-wider">
                Experiencia
              </h2>
              <div className="mt-2 space-y-3">
                {exps.map((e) => (
                  <div key={e.id}>
                    <div className="flex justify-between text-[12px]">
                      <span className="font-bold">
                        {e.company} — {e.role}
                      </span>
                      <span className="italic">{e.period}</span>
                    </div>
                    <ul className="ml-4 list-disc space-y-1 text-[12px] text-gray-800">
                      {e.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="border-b border-black/80 pb-0.5 font-sans text-[11px] font-bold uppercase tracking-wider">
                Educación e idiomas
              </h2>
              <ul className="mt-2 space-y-0.5 text-[12px] text-gray-800">
                {(profile.education || []).map((e) => (
                  <li key={e.id}>
                    {e.title} — {e.org} ({e.period})
                  </li>
                ))}
                <li>{(profile.languages || []).map((l) => `${l.name}: ${l.level}`).join("  ·  ")}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5">
          <div className="card sticky top-24 space-y-3 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-mid">Mensaje al reclutador</span>
              <button
                onClick={() => copy(vacancy.message, "Mensaje")}
                className="well card-hover flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-mid hover:text-ink-hi"
              >
                <Copy className="h-3 w-3" /> Copiar
              </button>
            </div>
            <textarea
              value={vacancy.message}
              onChange={(e) => updateVacancy(vacancy.id, { message: e.target.value })}
              rows={13}
              className="well w-full resize-y rounded-lg p-3 text-[13px] leading-relaxed text-ink-hi outline-none focus:border-brass/50"
            />
            {vacancy.status === "adaptada" ? (
              <button
                onClick={() => {
                  markSent(vacancy.id);
                  toast("Marcada como postulada", "ok");
                }}
                className="w-full rounded-full bg-brass px-4 py-2.5 text-[13px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft"
              >
                Ya la envié — marcar como postulada
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-depth/40 bg-depth/12 px-3 py-2.5 text-[12px] font-medium text-depth">
                <Check className="h-4 w-4" /> {vacancy.status === "entrevista" ? "En entrevista" : "Postulación registrada"}
                {vacancy.sentAt && (
                  <span className="tabular ml-auto font-mono text-[11px] text-depth/80">
                    {new Date(vacancy.sentAt).toLocaleDateString("es")}
                  </span>
                )}
              </div>
            )}

            <div className="well rounded-lg">
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-ink-lo"
              >
                Texto original de la vacante
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRaw ? "rotate-180" : ""}`} />
              </button>
              {showRaw && (
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap border-t border-[rgba(255,235,190,0.07)] px-3 py-2 font-sans text-[11px] leading-relaxed text-ink-mid">
                  {vacancy.raw}
                </pre>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
