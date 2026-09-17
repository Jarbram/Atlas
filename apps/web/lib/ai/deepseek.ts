import OpenAI from "openai";
import { Profile, flatSkills, adaptCV } from "@/lib/atlas/mock";

/** DeepSeek speaks the OpenAI API. Cheap; good enough to test the real flow. */
const client = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : null;

export const hasDeepSeek = () => client !== null;

type Adaptation = ReturnType<typeof adaptCV>;

const SYSTEM = `Actúas como un Experto en Reclutamiento Tecnológico y Especialista en Redacción de CVs con 15 años
de experiencia en empresas Fortune 500. Tu objetivo es optimizar el perfil del candidato para que encaje
al máximo con la vacante (JD) recibida, maximizando relevancia SIN inventar información: solo resaltas y
reformulas lo que el candidato ya hizo.

FASE 1 — ANÁLISIS (interno, antes de redactar):
- Identifica en la vacante las 5 hard skills y 5 soft skills más críticas, y las keywords que un ATS usaría
  para filtrar candidatos. Usa ese análisis para decidir qué destacar y con qué palabras, aunque el JSON de
  salida no tenga un campo separado para listarlas.

FASE 2 — OPTIMIZACIÓN DE CONTENIDO:
- "summaryLine" es el gancho directo hacia la vacante: identidad profesional + 2-3 keywords del rol + impacto.
- Cada bullet de "tailoredExperiences" sigue el método STAR (Situación/Tarea -> Acción -> Resultado) en una
  sola frase: arranca con verbo de acción fuerte (nunca "encargado de", "ayudé", "apoyé"), nombra la
  herramienta/tecnología y cierra con métrica o impacto cuantificable si el perfil lo trae.
- Si el perfil trae logros de construcción ágil de MVPs o métricas de producto (retención, churn, LTV,
  velocidad de iteración, etc.), resáltalos cuando la vacante lo valore.
- NO reduzcas el contenido: expande y detalla los bullets originales, no los resumas ni los recortes.

Devuelves SOLO un objeto JSON con esta forma exacta:
{
  "company": string,            // empresa de la vacante
  "title": string,              // puesto de la vacante
  "matched": string[],          // tecnologías/skills que la vacante pide y que YA están en el perfil
  "gaps": string[],             // tecnologías/skills que la vacante pide y NO están en el perfil. NO inventes. Si no hay, [].
  "experienceIds": string[],    // ids de perfil.experiences a destacar, más relevante primero, máximo 4
  "tailoredExperiences": [      // para CADA id de experienceIds, sus bullets reescritos
    {
      "id": string,             // el id de la experiencia del perfil
      "bullets": string[]       // 3-5 bullets DETALLADOS en español (método STAR, ver Fase 2), orientados a
                                // esta vacante. Reescribe y expande los bullets originales del perfil; NO
                                // inventes cifras, clientes, fechas ni logros que no estén ahí.
    }
  ],
  "summaryLine": string,        // UNA frase en español para añadir al resumen, a medida de esta vacante (ver Fase 2)
  "message": string,            // mensaje breve al reclutador en español, primera persona, 110-160 palabras,
                                // usando logros REALES del perfil. Sin inventar datos.
  "matchPct": number,           // entero 0-100: qué tan bien encaja el PERFIL (ya adaptado) con esta vacante
  "atsTip": string,             // máx 15 palabras: la keyword de la vacante que más conviene sumar o resaltar
  "extraSuggestion": string     // máx 30 palabras en español: un proyecto o certificación del perfil (real,
                                // ya presente ahí) que conviene resaltar en la entrevista para esta vacante
}
CÓMO ADAPTAR (filtros ATS):
- Usa la terminología EXACTA de la vacante para describir lo que el candidato YA hizo. Mismo hecho, dicho
  con la palabra que busca el ATS. Ej: "carga con lector de código de barras" -> "gestión de inventario".
- Mete las keywords de la vacante que se correspondan con algo real del perfil. Reordena: primero lo que más matchea.
- Regla dura: cada afirmación del CV adaptado tiene que poder defenderse en una entrevista. No inventes
  experiencia, empresas, títulos, certificaciones, años, tecnologías ni herramientas que no estén en el perfil.
Si el PERFIL trae "addedSkills", son habilidades REALES que el candidato añadió con una nota de cómo las usó:
trátalas como parte del perfil (pueden ir en "matched") e incorpora esa nota al "summaryLine", al "message"
y a los "tailoredExperiences" de la experiencia donde aplique.
No agregues texto fuera del JSON.`;

export async function adaptWithDeepSeek(raw: string, profile: Profile): Promise<Adaptation> {
  if (!client) throw new Error("no-key");

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `PERFIL:\n${JSON.stringify({
          name: profile.name,
          title: profile.title,
          summary: profile.summary,
          skills: flatSkills(profile),
          addedSkills: (profile.addedSkills || []).map((s) => ({ name: s.name, note: s.note })),
          experiences: profile.experiences.map((e) => ({
            id: e.id,
            role: e.role,
            company: e.company,
            period: e.period,
            bullets: e.bullets,
          })),
        })}\n\nVACANTE:\n${raw.slice(0, 8000)}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  // Validate + repair against the profile so the UI never gets a broken shape.
  const validIds = new Set(profile.experiences.map((e) => e.id));
  const experienceIds: string[] = Array.isArray(parsed.experienceIds)
    ? parsed.experienceIds.filter((id: unknown) => typeof id === "string" && validIds.has(id))
    : [];

  const asArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 24) : [];

  const finalIds = experienceIds.length
    ? experienceIds.slice(0, 4)
    : profile.experiences.slice(0, 3).map((e) => e.id);

  const tailoredExperiences = (Array.isArray(parsed.tailoredExperiences) ? parsed.tailoredExperiences : [])
    .filter((t: any) => t && typeof t.id === "string" && finalIds.includes(t.id))
    .map((t: any) => ({
      id: t.id as string,
      bullets: (Array.isArray(t.bullets) ? t.bullets : [])
        .map((b: any) => String(b).trim().slice(0, 400))
        .filter(Boolean)
        .slice(0, 6),
    }))
    .filter((t: { bullets: string[] }) => t.bullets.length > 0);

  return {
    company: String(parsed.company || "").trim() || "Empresa por confirmar",
    title: String(parsed.title || "").trim() || "Puesto por confirmar",
    matched: asArr(parsed.matched),
    gaps: asArr(parsed.gaps),
    experienceIds: finalIds,
    tailoredExperiences,
    summaryLine: String(parsed.summaryLine || "").trim(),
    message: String(parsed.message || "").trim(),
    matchPct: Math.max(0, Math.min(100, Math.round(Number(parsed.matchPct)) || 0)),
    atsTip: String(parsed.atsTip || "").trim().slice(0, 160),
    extraSuggestion: String(parsed.extraSuggestion || "").trim().slice(0, 240),
  };
}

const CV_PARSE_SYSTEM = `Eres un extractor experto de perfiles profesionales y CVs.
Recibes el texto plano extraído de un Curriculum Vitae (CV) / Resume en cualquier idioma y debes estructurarlo en español con la forma exacta JSON:
{
  "name": string,
  "title": string,
  "location": string,
  "phone": string,
  "email": string,
  "links": string[],
  "summary": string,
  "skills": [
    {
      "id": string,
      "group": string,
      "items": string[]
    }
  ],
  "experiences": [
    {
      "id": string,
      "role": string,
      "company": string,
      "location": string,
      "period": string,
      "bullets": string[]
    }
  ],
  "education": [
    {
      "id": string,
      "title": string,
      "org": string,
      "period": string
    }
  ],
  "languages": [
    {
      "id": string,
      "name": string,
      "level": string
    }
  ]
}
Devuelve EXCLUSIVAMENTE el objeto JSON válido. No agregues explicaciones fuera del JSON. Si no encuentras algún dato, déjalo como cadena vacía o arreglo vacío sin inventar información no presente en el documento.`;

export async function parseCVWithDeepSeek(rawCV: string): Promise<Profile> {
  if (!client) throw new Error("no-key");

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CV_PARSE_SYSTEM },
      { role: "user", content: `CV TEXTO EXTRAÍDO:\n${rawCV.slice(0, 12000)}` },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.map((s: any, idx: number) => ({
        id: s.id || `sk-${idx + 1}`,
        group: String(s.group || "Habilidades").trim(),
        items: Array.isArray(s.items)
          ? s.items.map((it: any) => String(it).trim()).filter(Boolean)
          : [],
      }))
    : [];

  const experiences = Array.isArray(parsed.experiences)
    ? parsed.experiences.map((e: any, idx: number) => ({
        id: e.id || `ex-${idx + 1}`,
        role: String(e.role || "").trim(),
        company: String(e.company || "").trim(),
        location: String(e.location || "Remoto").trim(),
        period: String(e.period || "").trim(),
        bullets: Array.isArray(e.bullets)
          ? e.bullets.map((b: any) => String(b).trim()).filter(Boolean)
          : [],
      }))
    : [];

  const education = Array.isArray(parsed.education)
    ? parsed.education.map((ed: any, idx: number) => ({
        id: ed.id || `ed-${idx + 1}`,
        title: String(ed.title || "").trim(),
        org: String(ed.org || "").trim(),
        period: String(ed.period || "").trim(),
      }))
    : [];

  const languages = Array.isArray(parsed.languages)
    ? parsed.languages.map((l: any, idx: number) => ({
        id: l.id || `lg-${idx + 1}`,
        name: String(l.name || "").trim(),
        level: String(l.level || "Intermedio").trim(),
      }))
    : [];

  return {
    name: String(parsed.name || "").trim(),
    title: String(parsed.title || "").trim(),
    location: String(parsed.location || "").trim(),
    phone: String(parsed.phone || "").trim(),
    email: String(parsed.email || "").trim(),
    links: Array.isArray(parsed.links)
      ? parsed.links.map((l: any) => String(l).trim()).filter(Boolean)
      : [],
    summary: String(parsed.summary || "").trim(),
    skills,
    experiences,
    education,
    languages,
    addedSkills: [],
  };
}
