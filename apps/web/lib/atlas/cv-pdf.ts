import React from "react";

/**
 * Render plain CV text to a PDF and trigger a browser download.
 * Uses @react-pdf/renderer (already a dependency); imported lazily by the caller
 * so it never lands in the main bundle.
 * ponytail: preformatted-text PDF — swap for a styled layout if the CV needs one.
 */
export async function downloadCvPdf(filename: string, text: string) {
  const { pdf, Document, Page, Text, StyleSheet } = await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: {
      paddingVertical: 44,
      paddingHorizontal: 52,
      fontSize: 10,
      lineHeight: 1.5,
      fontFamily: "Helvetica",
      color: "#111111",
    },
    line: { marginBottom: 2 },
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      ...text.split("\n").map((ln, i) =>
        React.createElement(Text, { key: i, style: styles.line }, ln || " "),
      ),
    ),
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
