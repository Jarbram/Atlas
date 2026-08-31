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
  "summaryLine": string,        // UNA frase en español para añadir al resumen, a medida de esta vacante
  "message": string             // mensaje breve al reclutador en español, primera persona, 110-160 palabras,
                                // usando logros REALES del perfil. Sin inventar datos.
}
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

  return {
    company: String(parsed.company || "").trim() || "Empresa por confirmar",
    title: String(parsed.title || "").trim() || "Puesto por confirmar",
    matched: asArr(parsed.matched),
    gaps: asArr(parsed.gaps),
    experienceIds: experienceIds.length
      ? experienceIds.slice(0, 4)
      : profile.experiences.slice(0, 3).map((e) => e.id),
    summaryLine: String(parsed.summaryLine || "").trim(),
    message: String(parsed.message || "").trim(),
  };
}
