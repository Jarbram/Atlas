/**
 * Fallback path: render the plain-text CV to a clean page and open the browser
 * print dialog (destination defaults to "Guardar como PDF"). No dependencies.
 * Used only if @react-pdf/renderer throws in the browser.
 */
export function printCvPdf(filename: string, text: string) {
  const esc = (str: string) =>
    str.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

  const parts: string[] = [];
  let seen = 0;
  for (const raw of text.split("\n")) {
    const t = raw.trimEnd();
    if (!t) {
      parts.push("<div class='sp'></div>");
      continue;
    }
    if (seen === 0) {
      parts.push(`<h1>${esc(t)}</h1>`);
      seen = 1;
      continue;
    }
    if (seen === 1) {
      parts.push(`<p class='meta'>${esc(t)}</p>`);
      seen = 2;
      continue;
    }
    if (t.startsWith("• ")) {
      parts.push(`<p class='b'>${esc(t.slice(2))}</p>`);
      continue;
    }
    if (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length < 48) {
      parts.push(`<h2>${esc(t)}</h2>`);
      continue;
    }
    parts.push(`<p>${esc(t)}</p>`);
  }

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(filename)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  html, body { margin: 0; }
  body { font: 12px/1.55 Georgia, "Times New Roman", serif; color: #111; }
  h1 { font-size: 19px; text-align: center; text-transform: uppercase; letter-spacing: .6px; margin: 0 0 3px; }
  p.meta { text-align: center; font: 10px/1.4 Arial, sans-serif; color: #444; margin: 0 0 10px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 16px 0 5px; }
  p { margin: 2px 0; }
  p.b { padding-left: 15px; text-indent: -10px; }
  p.b::before { content: "•  "; }
  .sp { height: 7px; }
</style></head><body>${parts.join("")}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    throw new Error("no-iframe");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}
