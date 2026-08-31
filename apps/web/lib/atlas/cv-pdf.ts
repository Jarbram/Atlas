import React from "react";

/**
 * Render the plain-text CV to a real PDF file and download it (one click).
 * Uses @react-pdf/renderer; imported lazily by the caller so it never lands in
 * the main bundle. next.config forces its browser build for the client.
 *
 * Typography mirrors the on-screen CV card: serif body (Times), sans-serif
 * contact line and section headers (Helvetica), bold role lines, italic dates.
 */
export async function downloadCvPdf(filename: string, text: string) {
  const { pdf, Document, Page, Text, StyleSheet } = await import("@react-pdf/renderer");

  const s = StyleSheet.create({
    page: {
      paddingVertical: 44,
      paddingHorizontal: 52,
      fontFamily: "Times-Roman",
      fontSize: 10.5,
      lineHeight: 1.5,
      color: "#141414",
    },
    name: {
      fontFamily: "Times-Bold",
      fontSize: 16,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 3,
    },
    meta: {
      fontFamily: "Helvetica",
      fontSize: 8.5,
      textAlign: "center",
      color: "#555555",
      marginBottom: 14,
    },
    h2: {
      fontFamily: "Helvetica-Bold",
      fontSize: 9,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 15,
      marginBottom: 5,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: "#000000",
    },
    role: { fontFamily: "Times-Bold", fontSize: 10.5, marginTop: 4, marginBottom: 1 },
    dates: { fontFamily: "Times-Italic" },
    p: { marginBottom: 2 },
    bullet: { marginBottom: 2, paddingLeft: 11 },
    sp: { height: 6 },
  });

  const isHeader = (t: string) =>
    t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length < 48;

  const children: React.ReactElement[] = [];
  let seen = 0; // 0 = name, 1 = contact, 2 = body
  text.split("\n").forEach((raw, i) => {
    const t = raw.trimEnd();
    if (!t) {
      children.push(React.createElement(Text, { key: i, style: s.sp }, " "));
      return;
    }
    if (seen === 0) {
      children.push(React.createElement(Text, { key: i, style: s.name }, t));
      seen = 1;
      return;
    }
    if (seen === 1) {
      children.push(React.createElement(Text, { key: i, style: s.meta }, t));
      seen = 2;
      return;
    }
    if (t.startsWith("• ")) {
      children.push(React.createElement(Text, { key: i, style: s.bullet }, `•  ${t.slice(2)}`));
      return;
    }
    if (isHeader(t)) {
      children.push(React.createElement(Text, { key: i, style: s.h2 }, t));
      return;
    }
    // "Company — Role (2024 – Presente)" → bold title, italic dates.
    const m = t.match(/^(.+ — .+?)\s*\(([^)]+)\)\s*$/);
    if (m) {
      children.push(
        React.createElement(
          Text,
          { key: i, style: s.role },
          m[1],
          React.createElement(Text, { style: s.dates }, `  (${m[2]})`),
        ),
      );
      return;
    }
    children.push(React.createElement(Text, { key: i, style: s.p }, t));
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(Page, { size: "A4", style: s.page }, ...children),
  );

  const blob = await pdf(doc as React.ReactElement).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
