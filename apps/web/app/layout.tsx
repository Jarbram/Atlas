import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas — Cartografía de carrera y navegación de precisión",
  description: "Panel de posicionamiento profesional y descubrimiento de ofertas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-chart-bg font-sans text-ink-hi antialiased selection:bg-brass/25 selection:text-brass-soft">
        {/*
          DIRECTION CONTRACT — Atlas Command Deck redesign
          THESIS: A career panel read like a night navigation chart. It refuses the
            AI-SaaS dark dashboard (near-black + neon + glow + all-caps mono).
          OWN-WORLD: Ground #10151C desaturated slate; hairline graticule; ONE matte
            accent (sextant brass #D9A441); teal #4F9E8F for state only; real value-step
            elevation, zero colored glow. Display = Bricolage Grotesque, UI = Hanken
            Grotesk in sentence case, mono (JetBrains) for numbers only. Drawn compass rose.
          STORY: Operator pastes one blob of vacancy text; the engine reads it
            against their profile and returns a matched CV + a recruiter message
            to copy or edit. Everything lands in a history. Three tabs, no more.
          FIRST VIEWPORT: Left chart-margin nav with drawn rose; main = one paste
            field + one primary action, or the CV / message result split.
          FORM: Operate. Marine chart / survey instrument. Code-led (no image gen).
          FINISH: unreviewed and undocumented is unfinished; this build ends with the
            finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
        */}
        {children}
      </body>
    </html>
  );
}
