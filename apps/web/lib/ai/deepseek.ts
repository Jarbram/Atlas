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

const SYSTEM = `Eres un asistente de carrera. Recibes el TEXTO de una vacante y el PERFIL (JSON) de un candidato.
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
      "bullets": string[]       // 3-5 bullets DETALLADOS en español: acción + herramientas + impacto/cifra,
                                // orientados a esta vacante. Reescribe y expande los bullets originales del
                                // perfil; NO inventes cifras, clientes, fechas ni logros que no estén ahí.
    }
  ],
  "summaryLine": string,        // UNA frase en español para añadir al resumen, a medida de esta vacante
  "message": string             // mensaje breve al reclutador en español, primera persona, 110-160 palabras,
                                // usando logros REALES del perfil. Sin inventar datos.
}
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
