/**
 * Self-check for the hallucination heuristic. No framework — run with:
 *   npx tsx lib/atlas/hallucination-check.check.ts
 */
import assert from "node:assert/strict";
import { EMPTY_PROFILE, type Profile } from "./mock";
import { hallucinationFlags } from "./hallucination-check";

const profile: Profile = {
  ...EMPTY_PROFILE,
  name: "Ana Pérez",
  summary: "Analista con experiencia en Python y Excel.",
  skills: [{ id: "s1", group: "Tech", items: ["Python", "Excel", "SQL"] }],
  experiences: [
    { id: "e1", role: "Analista", company: "Acme", location: "Lima", period: "2022", bullets: ["Automaticé reportes con Python."] },
  ],
};

const base = {
  company: "Globex",
  title: "Data Analyst",
  tailoredExperiences: [{ id: "e1", bullets: ["Automaticé reportes con Python."] }],
};

// Invented tech NOT in profile/vacancy -> flagged.
const f1 = hallucinationFlags(profile, {
  ...base,
  summaryLine: "Experiencia con Kubernetes y Tableau.",
  message: "Domino Kubernetes.",
});
assert.ok(f1.includes("Kubernetes"), "invented Kubernetes must be flagged");
assert.ok(f1.includes("Tableau"), "invented Tableau must be flagged");

// Terms present in profile or vacancy context -> NOT flagged.
const f2 = hallucinationFlags(profile, {
  ...base,
  summaryLine: "Python y Excel aplicados a reportes para Globex.",
  message: "Hola, soy Ana Pérez. Vi el puesto de Data Analyst en Globex.",
});
assert.deepEqual(f2, [], `clean output should have no flags, got ${JSON.stringify(f2)}`);

// Listed connectors / months / greetings are ignored (common capitalized words
// like "Disponible" are still flagged by design — this is a noisy alert, not proof).
const f3 = hallucinationFlags(profile, {
  ...base,
  summaryLine: "Con enfoque en datos. Este Enero, Para el equipo.",
  message: "Hola. Saludos.",
});
assert.deepEqual(f3, [], `IGNORE-listed words must not be flagged, got ${JSON.stringify(f3)}`);

console.log("hallucination-check: OK");
