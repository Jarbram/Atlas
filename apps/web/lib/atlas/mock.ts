/**
 * @file mock.ts
 * @description Types, seed data and the (stubbed) adaptation engine for the
 * Atlas MVP. Flow: paste one blob of vacancy text -> `adaptCV` reads the
 * profile and returns a matched CV selection + a recruiter message. Swap
 * `adaptCV` for a real model call when API keys exist; the shape stays.
 */

export type VacancyStatus = "adaptada" | "postulada" | "entrevista" | "descartada";

export const STATUS_ORDER: VacancyStatus[] = ["adaptada", "postulada", "entrevista", "descartada"];

export const STATUS_LABEL: Record<VacancyStatus, string> = {
  adaptada: "CV adaptado",
  postulada: "Postulada",
  entrevista: "Entrevista",
  descartada: "Descartada",
};

/** Whether an application still counts as "in play". */
export const isActive = (s: VacancyStatus) => s === "postulada" || s === "entrevista";

let idSeq = 0;
export function newId(prefix = "id") {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}${idSeq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

export interface Vacancy {
  id: string;
  raw: string;
  company: string;
  title: string;
  createdAt: string;
  status: VacancyStatus;
  sentAt?: string;
  message: string;
  summaryLine: string;
  experienceIds: string[];
  matched: string[];
  gaps: string[];
}

// ─── Profile (Mi información) — editable ────────────────────────────────────

export interface ProfileExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}
export interface SkillGroup {
  id: string;
  group: string;
  items: string[];
}
export interface EducationItem {
  id: string;
  title: string;
  org: string;
  period: string;
}
export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}
export interface Profile {
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  links: string[];
  summary: string;
  skills: SkillGroup[];
  experiences: ProfileExperience[];
  education: EducationItem[];
  languages: LanguageItem[];
}

export const flatSkills = (p: Profile) => p.skills.flatMap((g) => g.items);

export const SEED_PROFILE: Profile = {
  name: "Abraham Moisés Huacchillo Castillo",
  title: "Administración de Empresas · AI Ops & Product Builder",
  location: "Piura, Perú",
  phone: "+51 992487774",
  email: "huacchillocastillo@gmail.com",
  links: ["linkedin.com/in/abraham-huacchillo", "github.com/abraham-huacchillo"],
  summary:
    "Profesional en Administración de Empresas especializado en Operaciones de IA (AI Ops) y la construcción acelerada de productos digitales. Experto en metodologías Lean Startup y Agile, integrando herramientas de IA Generativa (Gemini, Claude Code) y stacks No-Code/Low-Code para transformar problemas complejos de negocio en ecosistemas automatizados y escalables. Orientado a métricas de producto, con capacidad demostrada para agilizar la validación de MVPs, reducir la deuda técnica en un 70 % y acelerar las iteraciones de desarrollo a una velocidad 3x superior al estándar de la industria.",
  skills: [
    {
      id: "sk-1",
      group: "AI & Development Tools",
      items: [
        "Gemini CLI", "Claude Code", "Cursor", "v0.dev", "Lovable", "Bolt.new",
        "Antigravity", "React", "TypeScript", "JavaScript", "Vite",
      ],
    },
    {
      id: "sk-2",
      group: "Automation & No-Code",
      items: ["n8n", "Make", "Airtable", "Softr", "Zapier", "Webflow", "WordPress", "Notion"],
    },
    {
      id: "sk-3",
      group: "Product Management",
      items: [
        "Roadmap Strategy", "User Stories", "Métricas de Producto (Retention, Churn, LTV)",
        "SQL", "Jira", "Agile/Scrum",
      ],
    },
    {
      id: "sk-4",
      group: "Data & Cloud",
      items: ["Supabase (PostgreSQL)", "Firebase", "MySQL", "MongoDB", "Vercel", "Git/GitHub"],
    },
  ],
  experiences: [
    {
      id: "ex-1",
      role: "Junior AI Ops Specialist",
      company: "SUBASTOP.CO",
      location: "Remoto",
      period: "May. 2026 – Presente",
      bullets: [
        "Lidero la transición técnica y operativa de la plataforma de subastas digitales hacia una operación integral impulsada por IA.",
        "Escalé la producción visual para producto y redes sociales mediante flujos automatizados, con un sistema de diseño centralizado en herramientas generativas.",
      ],
    },
    {
      id: "ex-2",
      role: "Product Lead & Founder",
      company: "LADRAAPP — ladraapp.com",
      location: "Remoto",
      period: "Ene. 2026 – Presente",
      bullets: [
        "Identifiqué una oportunidad en HealthTech veterinario y validé el mercado con No-Code, logrando conversión de ventas desde el lanzamiento.",
        "Lideré la migración a un stack escalable (Antigravity, Vercel, Supabase), reduciendo la deuda técnica en un 70 %.",
        "Diseñé flujos de desarrollo con Claude Code, incrementando la velocidad de iteración del producto en 300 % frente a procesos tradicionales.",
      ],
    },
    {
      id: "ex-3",
      role: "AI Systems & Automation Specialist / Recruiter",
      company: "TALENTCROSS",
      location: "Remoto",
      period: "Oct. 2024 – Presente",
      bullets: [
        "Diseñé ecosistemas de automatización (n8n, Make) e integré IA al ATS Manatal para filtrado predictivo, reduciendo la carga operativa en un 40 %.",
        "Récord de 60 vacantes IT Senior cerradas para Fortune 500, centralizando datos en Airtable y mejorando la trazabilidad en un 100 %.",
      ],
    },
    {
      id: "ex-4",
      role: "Product Manager & Founder (Winner Startup Perú 12g)",
      company: "DJPONLA — djponla.com",
      location: "Remoto",
      period: "May. 2024 – Presente",
      bullets: [
        "Lideré la expansión a 10 países en LATAM tras ganar el fondo de innovación Startup Perú 12g.",
        "Definí el roadmap con v0.dev y TypeScript, priorizando engagement y coordinando iteraciones con una comunidad de 40+ DJs.",
      ],
    },
    {
      id: "ex-5",
      role: "Systems & Operations Assistant",
      company: 'Programa "Gestores de Cambio"',
      location: "Remoto",
      period: "Jul. 2024 – Sep. 2024",
      bullets: [
        "Roboticé el funnel de admisión para 640+ aplicantes conectando Airtable, Make y WhatsApp Business.",
        "Eliminé procesos manuales y reduje los tiempos de respuesta al usuario de días a minutos.",
      ],
    },
    {
      id: "ex-6",
      role: "Practicante de Innovación y Emprendimiento",
      company: "Hub UDEP / Babson Collaborative",
      location: "Piura, Perú",
      period: "Jul. 2023 – Jul. 2024",
      bullets: [
        "Colaboré con CEOs de startups para diagnosticar cuellos de botella y validar modelos de negocio.",
        "Diseñé plataformas (Webflow, WordPress) y coordiné la logística de seminarios con 200+ asistentes.",
      ],
    },
  ],
  education: [
    { id: "ed-1", title: "Bachiller en Administración de Empresas", org: "Universidad de Piura", period: "2017 – 2022" },
    { id: "ed-2", title: "Diplomado en Innovación Abierta", org: "Universidad Tecnológica Nacional — Argentina", period: "2024" },
    { id: "ed-3", title: "Ethical Hacking", org: "Hackmetrix Hackers Academy", period: "2024" },
    { id: "ed-4", title: "Especialización en Frontend Development", org: "Oracle ONE / Alura", period: "2023" },
  ],
  languages: [
    { id: "lg-1", name: "Español", level: "Nativo (C2)" },
    { id: "lg-2", name: "Inglés", level: "Avanzado (B2+)" },
  ],
};

// ─── Adaptation engine (stubbed) ───────────────────────────────────────────

export const TECH_DICT = [
  "React", "Next.js", "Vue", "Angular", "Svelte", "TypeScript", "JavaScript",
  "Node.js", "Python", "Go", "Rust", "Java", "Kotlin", "Ruby", "Rails", "PHP",
  "Laravel", "C#", ".NET", "GraphQL", "REST", "gRPC", "PostgreSQL", "MySQL",
  "MongoDB", "Redis", "Elasticsearch", "Kafka", "RabbitMQ", "BullMQ", "Docker",
  "Kubernetes", "Terraform", "AWS", "GCP", "Azure", "Vercel", "Cloudflare",
  "CI/CD", "GitHub Actions", "Jenkins", "Playwright", "Cypress", "Jest",
  "Vitest", "Storybook", "Tailwind", "Radix", "Figma", "Supabase", "Firebase",
  "Prisma", "Drizzle", "FastAPI", "Django", "Flask", "Express", "NestJS",
  "OpenAI", "Anthropic", "Claude", "Gemini", "LangChain", "pgvector", "LLM",
  "RAG", "Airflow", "dbt", "Spark", "Pandas", "OpenTelemetry", "Datadog",
  "Grafana", "Sentry", "OAuth", "JWT", "WebSockets", "React Native", "Expo",
  "n8n", "Make", "Zapier", "Airtable", "Softr", "Webflow", "WordPress",
  "Notion", "Vite", "SQL", "Jira", "Agile", "Scrum", "Lean Startup", "Manatal",
];

function isKnown(term: string, skillsLc: Set<string>): boolean {
  const t = term.toLowerCase();
  for (const s of skillsLc) if (s === t || s.includes(t) || t.includes(s)) return true;
  return false;
}

export function analyzeVacancy(raw: string, skills: string[]) {
  const hay = ` ${raw.toLowerCase()} `;
  const skillsLc = new Set(skills.map((s) => s.toLowerCase()));
  const detected = TECH_DICT.filter((t) => hay.includes(t.toLowerCase()));
  return {
    detected,
    matched: detected.filter((t) => isKnown(t, skillsLc)),
    gaps: detected.filter((t) => !isKnown(t, skillsLc)),
  };
}

/** 0–100 "calce": share of the vacancy's detected tech that's already in your profile. */
export function calceScore(v: { matched: string[]; gaps: string[] }): number {
  const total = v.matched.length + v.gaps.length;
  if (total === 0) return 60;
  return Math.round((v.matched.length / total) * 100);
}

const STOP = new Set([
  "de", "la", "el", "en", "para", "con", "and", "the", "of", "a", "un", "una",
  "por", "los", "las", "que", "job", "role", "puesto", "vacante", "senior",
  "junior", "semi", "lead", "staff",
]);

function extractMeta(raw: string): { company: string; title: string } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "";
  let company = "";
  let title = "";

  const dash = first.split(/\s+[—–|·-]\s+/);
  if (dash.length >= 2) {
    // heuristic: the ALL-CAPS / shorter side is usually the company
    const [a, b] = dash;
    if (a.toUpperCase() === a || a.length < b.length) {
      company = a;
      title = b;
    } else {
      title = a;
      company = b;
    }
  }

  const mEn = first.match(/^(.+?)\s+(?:en|at|@|para)\s+(.+)$/i);
  if (!title && mEn) {
    title = mEn[1];
    company = mEn[2];
  }

  const mRole = raw.match(
    /(?:buscamos|búsqueda de|estamos buscando|vacante de|puesto:?|position:?|role:?|hiring an?|looking for an?)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n.,;:()]{2,64})/i,
  );
  if (mRole && (!title || title.length > 70)) title = mRole[1].trim();

  const mCo = raw.match(
    /\b([A-ZÁÉÍÓÚ][A-Za-z0-9.&'-]+(?:\s[A-ZÁÉÍÓÚ][A-Za-z0-9.&'-]+){0,3})\s+(?:busca|estamos|somos|is hiring|we are|es una|is a)/,
  );
  if (mCo && !company) company = mCo[1].trim();

  return {
    company: (company || first || "Empresa por confirmar").replace(/[."']+$/, "").slice(0, 64) ||
      "Empresa por confirmar",
    title: (title || first || "Puesto por confirmar").replace(/[."']+$/, "").slice(0, 80) ||
      "Puesto por confirmar",
  };
}

function buildMessage(p: Profile, company: string, title: string, matched: string[]) {
  const skillLine = (matched.length ? matched : flatSkills(p)).slice(0, 3).join(", ");
  const win =
    p.experiences[0]?.bullets[0]?.replace(/^[A-ZÁÉÍÓÚ][^:]{0,40}:\s*/, "").replace(/\.$/, "") ??
    "construido y escalado productos digitales de punta a punta";
  return `Hola,

Vi la vacante de ${title} en ${company} y me interesa mucho. Soy ${p.name}, ${p.title}.

Recientemente he ${win.charAt(0).toLowerCase()}${win.slice(1)}. Mi experiencia con ${skillLine} encaja directamente con lo que describen.

Te comparto mi CV adaptado a esta posición. ¿Tendrían 15 minutos esta semana para conversar?

Saludos,
${p.name}
${p.email} · ${p.phone}`;
}

/**
 * The (stubbed) "AI" step: read the pasted vacancy + the profile, decide which
 * experiences match, and draft the recruiter message. Replace the body with a
 * real model call; keep the return shape.
 */
export function adaptCV(raw: string, p: Profile) {
  const { company, title } = extractMeta(raw);
  const { matched, gaps } = analyzeVacancy(raw, flatSkills(p));
  const titleWords = title
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9.+#]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const scored = p.experiences.map((e) => {
    const text = `${e.role} ${e.company} ${e.bullets.join(" ")}`.toLowerCase();
    let score = 0;
    for (const m of matched) if (text.includes(m.toLowerCase())) score += 3;
    for (const w of titleWords) if (text.includes(w)) score += 2;
    return { e, score };
  });
  const ordered = [...scored].sort((a, b) => b.score - a.score);
  const picked = ordered.filter((x) => x.score > 0).slice(0, 4);
  const experienceIds = (picked.length ? picked : ordered.slice(0, 3)).map((x) => x.e.id);

  const focus = matched.slice(0, 4).join(", ") || title;
  const summaryLine = `Enfoque en ${focus}: encaje directo con lo que ${company} está buscando.`;

  return {
    company,
    title,
    matched,
    gaps,
    experienceIds,
    summaryLine,
    message: buildMessage(p, company, title, matched),
  };
}

// ─── Seed vacancy (first run only) ─────────────────────────────────────────

const SEED_RAW = `Orbital Systems Lab — Product Ops / AI Automation Specialist (Remoto)

Estamos buscando un/a Product Ops especialista en automatización con IA para escalar nuestras operaciones internas.

Responsabilidades:
- Diseñar y mantener flujos de automatización en n8n y Make.
- Integrar modelos de OpenAI y Claude en procesos de negocio.
- Definir métricas de producto (retention, churn) y tableros en Airtable / SQL.
- Documentar procesos en Notion y coordinar iteraciones ágiles (Scrum).

Requisitos:
- Experiencia con No-Code/Low-Code y APIs.
- Deseable: TypeScript, Supabase, Vercel.
- Mentalidad Lean Startup y foco en velocidad de iteración.`;

export function seedVacancies(): Vacancy[] {
  const a = adaptCV(SEED_RAW, SEED_PROFILE);
  return [
    {
      id: "vac-seed-1",
      raw: SEED_RAW,
      createdAt: "2026-08-27T09:00:00.000Z",
      status: "adaptada",
      ...a,
    },
  ];
}

// ─── Modules (nav) ─────────────────────────────────────────────────────────

export const MODULES = [
  { slug: "adaptar", label: "Adaptar", hint: "Pega una vacante y adapta tu CV" },
  { slug: "historial", label: "Historial", hint: "Vacantes adaptadas y postuladas" },
  { slug: "perfil", label: "Mi información", hint: "Tus datos, siempre editables" },
] as const;

export type ModuleSlug = (typeof MODULES)[number]["slug"];
