# Design — Atlas

<!-- impeccable:design-doc, code-led, from built world (apps/web/app) -->

**Direction:** *Workshop console.* Warm near-black ground, soft matte panels,
one gold accent, heavy use of monospace uppercase labels — a builder's
instrument, not a SaaS dashboard. Layout is a **full-width top bar** (no
sidebar) so every screen gets the horizontal room.

## Palette (tokens, `tailwind.config.js`)

| Token | Hex | Use |
|---|---|---|
| `chart-bg` | `#0B0906` | warm near-black ground |
| `chart-surface` | `#17120D` | panels / cards |
| `chart-raised` | `#1F1810` | avatars, letter badges |
| `chart-line` / `-strong` | `#2C2318` / `#3C3122` | (legacy — most borders now `rgba(255,235,190,.06–.16)`) |
| `ink-hi` / `mid` / `lo` | `#F4EEE2` / `#A99B84` / `#6E6252` | warm cream text ladder |
| `brass` / `soft` / `deep` | `#F0C24C` / `#F7D373` / `#B98F32` | the only accent — gold |
| `depth` / `deep` | `#6BA8C4` / `#3E6B7E` | secondary data (calce, progress) |
| `caution` | `#DB7C68` | negative / descartada |

Gold buttons are pill-shaped (`rounded-full`) with near-black text (`#1a1305`).
Body carries a faint warm grid (116px) + one low gold pool near the top.

## Materials (`globals.css` component layer)

- `.card` — matte panel: `#17120D`, faint top sheen gradient, `rgba(255,235,190,.08)`
  hairline, soft black-only drop shadow. `rounded-2xl` for majors.
- `.well` — recessed field: `rgba(0,0,0,.28)` + faint warm border. Inputs, chips, pills.
- `.card-hover` — border/bg lift on hover for interactive panels.
- `.glass` / `.glass-2` / `.glass-bar` are kept as **aliases** (glass = card,
  glass-bar = the blurred sticky top bar) so older markup still renders on-theme.
- Scrollbar: gold gradient thumb, transparent track, 11px (webkit + Firefox).
- The exported-CV paper stays opaque `#FBFAF6` with a strong shadow — the one
  solid object.

## Type

`next/font/google`: **Bricolage Grotesque** (`font-display` — page titles, big
numbers, section headers), **Hanken Grotesk** (`font-sans` — body/UI),
**JetBrains Mono** (`font-mono` — every uppercase tracked label, all figures,
step tags, table headers, dates). `borderRadius.DEFAULT` = 12px.

## Shell — `components/atlas/TopNav.tsx`

`[◈ mark] Atlas   Adaptar · Historial · Mi información        🔍  [+ Nueva vacante]  |  [avatar ▾]`
Sticky, `glass-bar`, active link carries a gold underline. Mobile collapses the
links into a toggle. ⌘K opens the command palette (kept, warm-restyled).

## Screens

- **Adaptar** — 1.75fr/1fr split. Left: gold title + a `[Pegar texto | Subir PDF]`
  pill toggle + a **terminal card** (traffic-light dots, `ENTRADA DE TEXTO` mono
  header, copy/clear, char pill + `Mín. 500 recomendado` + gold *Continuar
  análisis*). Right: **5-step vertical stepper** (`Paso 01…05`, icon nodes on a
  rail, active step ringed gold during the run) + a starfield `Motor de
  inferencia` card. `?v=<id>` → result view: editable title/company, a `CalceGauge`
  ring, matched/gaps card, 7/5 CV-paper + sticky message column.
- **Historial** — "Historial de aplicaciones" + 3 `StatCard`s (Total adaptaciones
  + `Sparkline`, Calce promedio + sky bar, Postulaciones activas + segment bars),
  then a `Registro de postulaciones` card: search, filter chips, and a **table**
  (Rol & empresa with letter badge · Fecha · `CalceGauge` · `StatusBadge` ·
  Abrir/eliminar), footer count.
- **Mi información** — full-width **dossier hero** (letter avatar w/ gold ring +
  glow, huge name, gold title, icon contact row, Exportar PDF / Editar perfil),
  then a 1.6fr/1fr grid of `Card`s: Resumen + Experiencia (circle-node timeline,
  gold period pills, `▸` bullets) left; Stack técnico / Educación / Idiomas right.
  Global edit toggle → inline inputs + fixed `glass-bar` save bar.

## Status model

`adaptada → postulada → entrevista`, plus `descartada`. `isActive()` = postulada
or entrevista. `calceScore()` = matched / (matched + gaps) tech, 0–100.

## Not built

`(auth)` pages, PDF upload/export (stubs → toast), real Supabase/AI wiring
(`adaptCV` is a heuristic). Pre-existing type errors in `lib/ai/tailor-engine.ts`
and `lib/supabase/*` block `next build`; `next dev` runs clean.
