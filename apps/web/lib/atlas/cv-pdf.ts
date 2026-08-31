import React from "react";

/**
 * Render the plain-text CV to a real PDF file and download it (one click).
 * Uses @react-pdf/renderer; imported lazily by the caller so it never lands in
 * the main bundle. next.config forces its browser build for the client.
 */
export async function downloadCvPdf(filename: string, text: string) {
  const { pdf, Document, Page, Text, StyleSheet } = await import("@react-pdf/renderer");

  const s = StyleSheet.create({
    page: { paddingVertical: 40, paddingHorizontal: 48, fontFamily: "Helvetica", color: "#111111" },
    name: { fontSize: 17, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 3 },
    meta: { fontSize: 9, textAlign: "center", color: "#444444", marginBottom: 12 },
    h2: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      marginTop: 14,
      marginBottom: 4,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: "#000000",
    },
    p: { fontSize: 10, lineHeight: 1.5, marginBottom: 2 },
    bullet: { fontSize: 10, lineHeight: 1.5, marginBottom: 2, paddingLeft: 10 },
    sp: { height: 6 },
  });

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
    if (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length < 48) {
      children.push(React.createElement(Text, { key: i, style: s.h2 }, t));
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
