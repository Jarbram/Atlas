/**
 * Self-check for the vacancy analyzer. No framework — run with:
 *   npx tsx lib/atlas/mock.check.ts   (or: node --experimental-strip-types)
 */
import assert from "node:assert/strict";
import { EMPTY_PROFILE, analyzeVacancy, detectCvLang, isCvEnglish, localizedProfile, type Profile } from "./mock";

// "Go" must not be detected from "Django"; "Java" must not be detected from "JavaScript".
const a = analyzeVacancy("Buscamos dev con experiencia en Django y JavaScript", []);
assert.ok(!a.detected.includes("Go"), "Go should not match inside Django");
assert.ok(!a.detected.includes("Java"), "Java should not match inside JavaScript");
assert.ok(a.detected.includes("Django"), "Django should be detected");
assert.ok(a.detected.includes("JavaScript"), "JavaScript should be detected");

// Tokens with punctuation still match.
const b = analyzeVacancy("Stack: Node.js, C#, CI/CD", []);
assert.ok(b.detected.includes("Node.js") && b.detected.includes("C#"), "punctuated tokens match");

// matched vs gaps split by profile skills.
const c = analyzeVacancy("Necesario React y Kubernetes", ["react"]);
assert.deepEqual(c.matched, ["React"]);
assert.deepEqual(c.gaps, ["Kubernetes"]);

// Language follows the posting; English tech terms don't flip a Spanish one.
assert.equal(detectCvLang("We are hiring a backend engineer. You will build APIs with Node.js and own the roadmap."), "en");
assert.equal(detectCvLang("Buscamos un Backend Developer con experiencia en Node.js, React, AWS y CI/CD para el equipo de Cloud."), "es");
assert.equal(detectCvLang("Node.js React AWS"), "es");

const pr: Profile = {
  ...EMPTY_PROFILE,
  summary: "Analista de datos.",
  location: "Lima, Perú",
  experiences: [{ id: "e1", role: "Analista", company: "Acme", location: "Lima", period: "2022 – Presente", bullets: ["Automaticé reportes."] }],
  education: [{ id: "ed1", title: "Ingeniería", org: "UNI", period: "2020" }],
  languages: [{ id: "l1", name: "Español", level: "Nativo" }],
};
const cv = {
  summary: "Data analyst with a focus on reporting.",
  location: "Lima, Peru",
  experiences: [{ id: "e1", role: "Analyst", period: "2022 – Present" }],
  education: [{ id: "ed1", title: "Engineering" }],
  languages: [{ id: "l1", name: "Spanish", level: "Native" }],
};
const english = {
  cv,
  summaryLine: "Analyst with reporting automation experience.",
  message: "Hello, I am applying for the role and have automated reports with Python.",
  experienceIds: ["e1"],
  tailoredExperiences: [{ id: "e1", bullets: ["Automated reports with Python."] }],
};

// Translated fields replace the profile's by id; proper nouns and untranslated fields stay.
const loc = localizedProfile(pr, cv);
assert.equal(loc.summary, cv.summary);
assert.deepEqual([loc.experiences[0].role, loc.experiences[0].period, loc.experiences[0].company], ["Analyst", "2022 – Present", "Acme"]);
assert.deepEqual([loc.education[0].title, loc.education[0].org, loc.education[0].period], ["Engineering", "UNI", "2020"]);
assert.equal(localizedProfile(pr), pr);

// Complete English output passes; anything that would leak Spanish onto the CV fails.
assert.ok(isCvEnglish(english, pr));
assert.ok(!isCvEnglish({ ...english, cv: undefined }, pr), "no translation layer");
assert.ok(!isCvEnglish({ ...english, tailoredExperiences: [] }, pr), "missing bullets fall back to Spanish");
assert.ok(!isCvEnglish({ ...english, cv: { ...cv, education: [] } }, pr), "untranslated education");
assert.ok(!isCvEnglish({ ...english, message: "Hola, tengo experiencia con los reportes para el equipo." }, pr), "Spanish message");
assert.ok(!isCvEnglish({ ...english, tailoredExperiences: [{ id: "e1", bullets: ["Automaticé reportes con Python para el equipo."] }] }, pr), "Spanish bullets");

console.log("mock.check: OK");
