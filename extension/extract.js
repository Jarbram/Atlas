// Se inyecta en la pestaña activa al hacer clic en el botón. Devuelve el texto
// de la vacante. Heurística: probar contenedores conocidos por sitio; si ninguno
// sirve, caer al innerText del body. Es frágil por diseño (los portales cambian
// su markup) — por eso el fallback siempre devuelve algo.
function atlasExtractVacancy() {
  const clean = (s) => (s || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  const pick = (sels) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      const t = clean(el && el.innerText);
      if (t && t.length > 200) return t;
    }
    return "";
  };

  const host = location.hostname;
  let body = "";

  if (host.includes("linkedin.com")) {
    body = pick([
      ".jobs-description__content",
      ".jobs-box__html-content",
      ".show-more-less-html__markup",
      "#job-details",
    ]);
  } else if (host.includes("computrabajo")) {
    body = pick(["p.mbB", ".box_detail", "[class*='detalle']", "article", "main"]);
  } else if (host.includes("getonbrd") || host.includes("getonboard")) {
    body = pick(["#job-body", ".gb-rich-text", ".job-section", "main"]);
  }

  if (!body) {
    body = pick(["article", "main", "[role='main']", "#content", ".content"]) ||
      clean(document.body && document.body.innerText);
  }

  const heading = clean(
    (document.querySelector("h1") && document.querySelector("h1").innerText) || document.title,
  );

  const out = [heading, location.href, "", body].filter(Boolean).join("\n").slice(0, 12000);
  return out;
}
