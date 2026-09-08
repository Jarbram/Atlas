/**
 * @file hallucination-check.ts
 * @description Heurística de texto (sin IA) portada de Gercle/job-search-automation.
 * Compara el CV adaptado contra el perfil base + los datos de la vacante y marca
 * términos "verificables" (nombres propios, tecnologías, herramientas) que no
 * aparecen en ninguno de los dos. Es una ALERTA para revisar antes de enviar,
 * no un bloqueo ni una prueba: tendrá algún falso positivo con nombres propios.
 */

import type { Profile } from "./mock";

const norm = (s: string) =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Palabras con mayúscula inicial, 3+ chars: candidatas a "afirmación verificable".
const TOKEN_RE = /\b[A-ZÁÉÍÓÚÑ][A-Za-zÀ-ÿ0-9+.#/-]{2,}\b/g;

// ponytail: lista fija de conectores/meses en español + inglés. Amplíala si aparecen
//           falsos positivos recurrentes; no vale la pena un NLP para esto.
const IGNORE = new Set(
  [
    "El","La","Los","Las","Un","Una","Con","Para","Por","En","De","Del","Y","O","Se","Su","Sus",
    "Que","Como","Mas","Más","Este","Esta","Estos","Estas","Entre","Sin","Sobre","Desde","Hasta",
    "Durante","Mi","Me","Al","No","Lo","Ya","Fui","Soy","Tengo","Hola","Saludos","Atentamente",
    "The","And","For","With","This","That","From","Your","Our","We","Me","My","Hi","Hello","Regards",
    "Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Setiembre",
    "Octubre","Noviembre","Diciembre",
    "January","February","March","April","June","July","August","September","October","November","December",
  ].map((w) => w),
);

interface AdaptedParts {
  company: string;
  title: string;
  summaryLine: string;
  message: string;
  tailoredExperiences: { id: string; bullets: string[] }[];
}

/** Todo el texto "permitido": perfil base + contexto de esta vacante. */
function allowedText(profile: Profile, company: string, title: string): string {
  const parts: string[] = [
    profile.name, profile.title, profile.location, profile.summary, company, title,
    ...profile.links,
    ...profile.skills.flatMap((g) => [g.group, ...g.items]),
    ...(profile.addedSkills ?? []).flatMap((s) => [s.name, s.note]),
    ...profile.experiences.flatMap((e) => [e.role, e.company, e.location, e.period, ...e.bullets]),
    ...profile.education.flatMap((e) => [e.title, e.org, e.period]),
    ...profile.languages.flatMap((l) => [l.name, l.level]),
  ];
  return norm(parts.filter(Boolean).join(" "));
}

/**
 * Devuelve los términos sospechosos (sin repetir, máx 12). Vacío = nada que revisar.
 */
export function hallucinationFlags(profile: Profile, a: AdaptedParts): string[] {
  const allowed = allowedText(profile, a.company, a.title);
  const generated = [
    a.summaryLine,
    a.message,
    ...a.tailoredExperiences.flatMap((t) => t.bullets),
  ].join("\n");

  const seen = new Set<string>();
  const flags: string[] = [];
  for (const token of generated.match(TOKEN_RE) ?? []) {
    if (IGNORE.has(token) || seen.has(token)) continue;
    seen.add(token);
    if (!allowed.includes(norm(token))) flags.push(token);
    if (flags.length >= 12) break;
  }
  return flags;
}
