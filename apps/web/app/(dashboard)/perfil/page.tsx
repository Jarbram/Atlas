"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  GraduationCap,
  Terminal,
  Languages as LanguagesIcon,
  UserRound,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  MapPin,
  Mail,
  Link2,
  Building2,
  FileUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Profile, newId, isProfileEmpty } from "@/lib/atlas/mock";
import { useDeck, useToast } from "@/lib/atlas/store";
import { Tag } from "@/components/atlas/bits";

const inputCls =
  "w-full rounded-lg well px-2.5 py-1.5 text-[13px] text-ink-hi outline-none focus:border-brass/50";

export default function PerfilPage() {
  const router = useRouter();
  const { profile, setProfile, parseAndSetProfile } = useDeck();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmpty = isProfileEmpty(profile);

  const start = () => {
    setDraft(structuredClone(profile));
    setEditing(true);
  };

  const save = () => {
    setProfile(draft);
    setEditing(false);
    toast("Información actualizada", "ok");
  };

  const cancel = () => setEditing(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".txt")) {
      toast("Por favor selecciona un archivo PDF o TXT válido");
      return;
    }

    setUploading(true);
    setUploadStep(1);

    const stepTimer = setTimeout(() => setUploadStep(2), 1200);
    const wasEmpty = isEmpty;

    try {
      const parsed = await parseAndSetProfile(file);
      setDraft(structuredClone(parsed));
      toast(`¡Perfil de ${parsed.name || "candidato"} cargado exitosamente!`, "ok");
      if (wasEmpty) {
        setTimeout(() => {
          router.push("/adaptar");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Error al procesar el CV:", err);
      toast(err.message || "Error al procesar el archivo PDF");
    } finally {
      clearTimeout(stepTimer);
      setUploading(false);
      setUploadStep(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const p = editing ? draft : profile;
  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch });

  // ─── Onboarding / Empty state view (First time / New account) ───────────────
  if (isEmpty && !editing) {
    return (
      <div className="mx-auto flex min-h-[75vh] w-full max-w-[800px] flex-col items-center justify-center px-4 py-12 sm:px-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />

        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/30 bg-brass/10 shadow-[0_0_30px_-5px_rgba(240,194,76,0.3)]">
            <Sparkles className="h-7 w-7 text-brass" />
          </div>
          <h1 className="mt-5 font-display text-[32px] font-semibold tracking-tight text-ink-hi sm:text-[40px]">
            Carga tu Curriculum Vitae
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-ink-mid">
            Sube tu CV en PDF para que nuestro motor de Inteligencia Artificial extraiga automáticamente tu experiencia, habilidades y educación.
          </p>
        </div>

        {/* Single action dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`card mt-8 w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
            dragOver
              ? "border-brass bg-brass/10 scale-[1.01]"
              : "border-[rgba(255,235,190,0.15)] hover:border-brass/50 hover:bg-[rgba(255,235,190,0.02)]"
          }`}
        >
          {uploading ? (
            <div className="space-y-5 py-6">
              <RefreshCw className="mx-auto h-10 w-10 animate-spin text-brass" />
              <div>
                <p className="font-display text-[18px] font-semibold text-ink-hi">
                  {uploadStep === 1
                    ? "Leyendo documento PDF..."
                    : "Extrayendo perfil con IA..."}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-lo">
                  DeepSeek AI Extraction
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brass/20 bg-chart-raised text-brass">
                <FileUp className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[16px] font-medium text-ink-hi">
                  Arrastra tu archivo PDF o haz clic aquí
                </p>
                <p className="mt-1 text-[12px] text-ink-lo">
                  Formatos soportados: PDF, TXT
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 text-[14px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft"
              >
                <FileUp className="h-4 w-4" /> Cargar CV (PDF)
              </button>
            </div>
          )}
        </div>

        {/* Alternative: manual fill */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setDraft(structuredClone(profile));
              setEditing(true);
            }}
            className="text-[13px] font-medium text-ink-lo transition-colors hover:text-brass hover:underline"
          >
            O completar perfil manualmente →
          </button>
        </div>
      </div>
    );
  }

  // ─── Profile Details View (Only visible once CV has been uploaded) ───────────
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${editing ? "pb-28" : ""}`}>
      {/* Hero */}
      <div className="reveal flex flex-col gap-6 border-b border-[rgba(255,235,190,0.08)] pb-8 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-brass/50 bg-chart-raised font-display text-[34px] font-semibold text-brass-soft shadow-[0_0_44px_-8px_rgba(240,194,76,0.4)]">
            {(p.name || "A").trim().charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                className={`${inputCls} font-display text-[20px] font-semibold`}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Nombre completo"
              />
              <input
                className={inputCls}
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Titular profesional"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input className={inputCls} value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ubicación" />
                <input className={inputCls} value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Teléfono" />
                <input className={inputCls} value={draft.email} onChange={(e) => set({ email: e.target.value })} placeholder="Email" />
              </div>
              <input
                className={inputCls}
                value={draft.links.join(", ")}
                onChange={(e) => set({ links: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="Enlaces separados por coma (LinkedIn, GitHub, Portafolio)"
              />
            </div>
          ) : (
            <>
              <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-ink-hi sm:text-[42px]">
                {p.name || "Perfil sin nombre"}
              </h1>
              <p className="mt-1 text-[16px] font-medium text-brass">{p.title || "Titular profesional no definido"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-ink-mid">
                {p.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-ink-lo" /> {p.location}
                  </span>
                )}
                {p.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-ink-lo" /> {p.email}
                  </span>
                )}
                {p.links.map((l) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-ink-lo" /> {l}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={start}
              className="flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar perfil
            </button>
          </div>
        )}
      </div>

      {/* Body Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          <Card icon={UserRound} title="Resumen profesional">
            {editing ? (
              <textarea
                className={`${inputCls} resize-y leading-relaxed`}
                rows={6}
                value={draft.summary}
                onChange={(e) => set({ summary: e.target.value })}
                placeholder="Escribe un breve resumen de tu trayectoria y especialidad…"
              />
            ) : (
              <p className="text-[14px] leading-[1.75] text-ink-mid">
                {p.summary || "Sin resumen especificado."}
              </p>
            )}
          </Card>

          <Card
            icon={Briefcase}
            title="Experiencia laboral"
            action={
              editing && (
                <AddBtn
                  onClick={() =>
                    set({
                      experiences: [
                        { id: newId("ex"), role: "", company: "", location: "", period: "", bullets: [] },
                        ...draft.experiences,
                      ],
                    })
                  }
                />
              )
            }
          >
            {editing ? (
              <div className="space-y-3">
                {p.experiences.map((e, i) => (
                  <div key={e.id} className="well space-y-2 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} value={e.role} placeholder="Cargo / Rol" onChange={(ev) => patchArr(draft, set, "experiences", i, { role: ev.target.value })} />
                      <RmBtn onClick={() => set({ experiences: draft.experiences.filter((x) => x.id !== e.id) })} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input className={inputCls} value={e.company} placeholder="Empresa" onChange={(ev) => patchArr(draft, set, "experiences", i, { company: ev.target.value })} />
                      <input className={inputCls} value={e.location} placeholder="Ubicación" onChange={(ev) => patchArr(draft, set, "experiences", i, { location: ev.target.value })} />
                      <input className={inputCls} value={e.period} placeholder="Periodo" onChange={(ev) => patchArr(draft, set, "experiences", i, { period: ev.target.value })} />
                    </div>
                    <textarea
                      className={`${inputCls} resize-y leading-relaxed`}
                      rows={4}
                      value={e.bullets.join("\n")}
                      placeholder="Logros y responsabilidades (un logro por línea)"
                      onChange={(ev) =>
                        patchArr(draft, set, "experiences", i, {
                          bullets: ev.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </div>
                ))}
                {p.experiences.length === 0 && (
                  <p className="text-[13px] text-ink-lo">Sin experiencias añadidas aún.</p>
                )}
              </div>
            ) : p.experiences.length > 0 ? (
              <ol className="relative space-y-6 border-l border-[rgba(255,235,190,0.12)] pl-7">
                {p.experiences.map((e, i) => (
                  <li key={e.id} className="relative">
                    <span
                      className={`absolute -left-[35px] top-0.5 h-4 w-4 rounded-full border-2 ${
                        i === 0 ? "border-brass bg-brass/20" : "border-[rgba(255,235,190,0.25)] bg-chart-bg"
                      }`}
                    />
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                      <span className="font-display text-[16px] font-semibold text-ink-hi">{e.role}</span>
                      {e.period && (
                        <span className="tabular shrink-0 rounded-md border border-brass/25 bg-brass/10 px-2 py-0.5 font-mono text-[11px] text-brass-soft">
                          {e.period}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-mid">
                      <Building2 className="h-3.5 w-3.5 text-ink-lo" /> {e.company}
                      {e.location && <span className="text-ink-lo">· {e.location}</span>}
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
                      {e.bullets.map((b, bi) => (
                        <li key={bi} className="relative pl-4 before:absolute before:left-0 before:top-[0.5em] before:text-brass before:content-['▸']">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-ink-lo">No hay experiencias laborales registradas.</p>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card
            icon={Terminal}
            title="Stack técnico"
            action={
              editing && (
                <AddBtn
                  onClick={() =>
                    set({ skills: [...draft.skills, { id: newId("sk"), group: "Nuevo grupo", items: [] }] })
                  }
                />
              )
            }
          >
            <div className="space-y-4">
              {p.skills.map((g, i) =>
                editing ? (
                  <div key={g.id} className="well rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} value={g.group} placeholder="Nombre de categoría" onChange={(e) => patchArr(draft, set, "skills", i, { group: e.target.value })} />
                      <RmBtn onClick={() => set({ skills: draft.skills.filter((x) => x.id !== g.id) })} />
                    </div>
                    <TagInput
                      className="mt-2"
                      value={g.items}
                      onChange={(items) => patchArr(draft, set, "skills", i, { items })}
                      placeholder="Escribe y presiona Enter…"
                    />
                  </div>
                ) : (
                  <div key={g.id}>
                    <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-lo">
                      {g.group}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((s) => (
                        <Tag key={s}>{s}</Tag>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {p.skills.length === 0 && (
                <p className="text-[13px] text-ink-lo">No se han especificado habilidades técnicas.</p>
              )}
            </div>
          </Card>

          <Card
            icon={GraduationCap}
            title="Educación"
            action={
              editing && (
                <AddBtn
                  onClick={() =>
                    set({ education: [...draft.education, { id: newId("ed"), title: "", org: "", period: "" }] })
                  }
                />
              )
            }
          >
            <div className="space-y-4">
              {p.education.map((e, i) =>
                editing ? (
                  <div key={e.id} className="well space-y-2 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} value={e.title} placeholder="Título o Carrera" onChange={(ev) => patchArr(draft, set, "education", i, { title: ev.target.value })} />
                      <RmBtn onClick={() => set({ education: draft.education.filter((x) => x.id !== e.id) })} />
                    </div>
                    <input className={inputCls} value={e.org} placeholder="Institución / Universidad" onChange={(ev) => patchArr(draft, set, "education", i, { org: ev.target.value })} />
                    <input className={inputCls} value={e.period} placeholder="Periodo" onChange={(ev) => patchArr(draft, set, "education", i, { period: ev.target.value })} />
                  </div>
                ) : (
                  <div key={e.id}>
                    <p className="text-[14px] font-medium leading-snug text-ink-hi">{e.title}</p>
                    <p className="mt-0.5 text-[13px] text-brass-soft">{e.org}</p>
                    {e.period && <p className="tabular mt-0.5 font-mono text-[11px] text-ink-lo">{e.period}</p>}
                  </div>
                ),
              )}
              {p.education.length === 0 && (
                <p className="text-[13px] text-ink-lo">No se han registrado títulos o educación.</p>
              )}
            </div>
          </Card>

          <Card
            icon={LanguagesIcon}
            title="Idiomas"
            action={
              editing && (
                <AddBtn onClick={() => set({ languages: [...draft.languages, { id: newId("lg"), name: "", level: "" }] })} />
              )
            }
          >
            <div className="space-y-2">
              {p.languages.map((l, i) =>
                editing ? (
                  <div key={l.id} className="flex items-center gap-2">
                    <input className={inputCls} value={l.name} placeholder="Idioma" onChange={(ev) => patchArr(draft, set, "languages", i, { name: ev.target.value })} />
                    <input className={inputCls} value={l.level} placeholder="Nivel" onChange={(ev) => patchArr(draft, set, "languages", i, { level: ev.target.value })} />
                    <RmBtn onClick={() => set({ languages: draft.languages.filter((x) => x.id !== l.id) })} />
                  </div>
                ) : (
                  <div key={l.id} className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-ink-hi">{l.name}</span>
                    <span className="tabular font-mono text-[11px] text-ink-mid">{l.level}</span>
                  </div>
                ),
              )}
              {p.languages.length === 0 && (
                <p className="text-[13px] text-ink-lo">No se han agregado idiomas.</p>
              )}
            </div>
          </Card>

          <Card
            icon={Sparkles}
            title="Habilidades añadidas"
            action={
              editing && (
                <AddBtn
                  onClick={() =>
                    set({ addedSkills: [...draft.addedSkills, { id: newId("as"), name: "", note: "" }] })
                  }
                />
              )
            }
          >
            <div className="space-y-3">
              {p.addedSkills.map((a, i) =>
                editing ? (
                  <div key={a.id} className="well space-y-2 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} value={a.name} placeholder="Habilidad" onChange={(ev) => patchArr(draft, set, "addedSkills", i, { name: ev.target.value })} />
                      <RmBtn onClick={() => set({ addedSkills: draft.addedSkills.filter((x) => x.id !== a.id) })} />
                    </div>
                    <textarea
                      className={`${inputCls} resize-y leading-relaxed`}
                      rows={3}
                      value={a.note}
                      placeholder="¿Cómo la usaste? Proyecto, resultado, contexto…"
                      onChange={(ev) => patchArr(draft, set, "addedSkills", i, { note: ev.target.value })}
                    />
                  </div>
                ) : (
                  <div key={a.id}>
                    <p className="text-[14px] font-medium leading-snug text-ink-hi">{a.name}</p>
                    {a.note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-mid">{a.note}</p>}
                  </div>
                ),
              )}
              {p.addedSkills.length === 0 && (
                <p className="text-[13px] text-ink-lo">
                  Al adaptar una vacante puedes añadir aquí las habilidades que pide y describir cómo las usaste.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Floating Save/Cancel bar — portaled to <body>: a "reveal" ancestor
          animates `transform`, which makes it a containing block and breaks
          `position: fixed` (bar was only reachable by scrolling to the end). */}
      {editing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="glass-bar fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(255,235,190,0.08)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
              <span className="hidden items-center gap-2 text-[12px] text-ink-lo sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-brass" /> Editando información del perfil
              </span>
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  onClick={cancel}
                  className="well card-hover flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink-mid hover:text-ink-hi"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  onClick={save}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brass px-5 py-2.5 text-[13px] font-semibold text-[#1a1305] hover:bg-brass-soft sm:flex-none"
                >
                  <Check className="h-4 w-4" /> Guardar cambios
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function patchArr<K extends "skills" | "experiences" | "education" | "languages" | "addedSkills">(
  draft: Profile,
  set: (patch: Partial<Profile>) => void,
  key: K,
  index: number,
  patch: Partial<Profile[K][number]>,
) {
  const next = (draft[key] as unknown[]).map((row, i) =>
    i === index ? { ...(row as object), ...patch } : row,
  );
  set({ [key]: next } as unknown as Partial<Profile>);
}

function Card({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-ink-hi">
          <Icon className="h-4 w-4 text-brass" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,235,190,0.12)] text-ink-lo transition-colors hover:border-brass/40 hover:text-brass"
      aria-label="Añadir"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
}

function TagInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className={`well flex flex-wrap items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${className}`}>
      {value.map((tag, i) => (
        <span key={tag} className="flex items-center gap-1 rounded-md bg-brass/10 px-2 py-0.5 text-[12px] text-brass-soft">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, vi) => vi !== i))}
            className="text-brass-soft/70 hover:text-caution"
            aria-label={`Quitar ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent text-[13px] text-ink-hi outline-none placeholder:text-ink-lo"
      />
    </div>
  );
}

function RmBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 text-ink-lo hover:text-caution" aria-label="Quitar">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
