/**
 * Self-check for the vacancy analyzer. No framework — run with:
 *   npx tsx lib/atlas/mock.check.ts   (or: node --experimental-strip-types)
 */
import assert from "node:assert/strict";
import { analyzeVacancy } from "./mock";

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

console.log("mock.check: OK");
