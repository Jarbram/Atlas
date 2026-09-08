"use client";

/**
 * @file extension/page.tsx
 * @description Página de instalación del atajo "Enviar vacante".
 * Para amigos no técnicos: arrastrar un bookmarklet a la barra de favoritos.
 * Para el resto: cargar la extensión sin empaquetar (carpeta /extension del repo).
 * El bookmarklet apunta al origin actual, así funciona en local y en producción sin config.
 */

import { useEffect, useRef } from "react";
import { Bookmark, MousePointerClick, Puzzle } from "lucide-react";
import { Eyebrow } from "@/components/atlas/bits";
import { useToast } from "@/lib/atlas/store";

function buildBookmarklet(origin: string): string {
  // Una sola línea: usa el texto seleccionado si hay; si no, el contenedor de la
  // vacante por selectores conocidos; si no, el body. Abre Atlas con el texto en #raw=.
  const body = `(function(){var s=String(window.getSelection()).trim();var el=document.querySelector('.jobs-description__content,.jobs-box__html-content,.show-more-less-html__markup,#job-details,#job-body,.box_detail,article,main');var b=s.length>200?s:((el||document.body).innerText||'');var h=((document.querySelector('h1')||{}).innerText)||document.title;var t=(h+'\\n'+location.href+'\\n\\n'+b).replace(/\\n{3,}/g,'\\n\\n').trim().slice(0,12000);if(t.length<40){window.open(${JSON.stringify(origin)}+'/adaptar','_blank');return;}window.open(${JSON.stringify(origin)}+'/adaptar#raw='+encodeURIComponent(t),'_blank');})();`;
  return "javascript:" + body;
}

export default function ExtensionPage() {
  const toast = useToast();
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Set the javascript: href via the DOM (not a JSX prop) to skip React's
  // "javascript: URL" dev warning. Bookmarklets legitimately need this scheme.
  useEffect(() => {
    if (linkRef.current) linkRef.current.href = buildBookmarklet(window.location.origin);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Eyebrow>Atajo</Eyebrow>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.05] tracking-tight text-brass sm:text-[36px]">
        Enviar vacante con un clic
      </h1>
      <p className="mt-3 max-w-[620px] text-[14px] leading-relaxed text-ink-mid">
        En vez de copiar y pegar, agarrá la vacante de la página en la que estás y abrila
        acá lista para adaptar. Elegí una de las dos formas.
      </p>

      {/* Bookmarklet — para todos */}
      <section className="card mt-8 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[12px] font-medium text-brass">
          <Bookmark className="h-4 w-4" /> Opción fácil · funciona en cualquier navegador
        </div>
        <h2 className="mt-2 font-display text-[19px] font-semibold text-ink-hi">
          Botón en la barra de favoritos
        </h2>

        <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-mid">
          <li>
            <span className="font-mono text-ink-lo">1 · </span>
            Mostrá la barra de favoritos si no la ves:{" "}
            <kbd className="rounded bg-[rgba(255,235,190,0.08)] px-1.5 py-0.5 font-mono text-[12px] text-ink-hi">
              Ctrl+Shift+B
            </kbd>{" "}
            (Mac: <kbd className="rounded bg-[rgba(255,235,190,0.08)] px-1.5 py-0.5 font-mono text-[12px] text-ink-hi">⌘+Shift+B</kbd>).
          </li>
          <li>
            <span className="font-mono text-ink-lo">2 · </span>
            Arrastrá este botón hasta la barra de favoritos:
          </li>
        </ol>

        <div className="mt-3 flex items-center gap-3">
          <a
            ref={linkRef}
            href="/extension"
            onClick={(e) => {
              e.preventDefault();
              toast("No lo hagas clic acá — arrastralo a la barra de favoritos", "info");
            }}
            draggable
            className="inline-flex cursor-grab items-center gap-2 rounded-lg border border-brass/40 bg-brass/12 px-4 py-2.5 text-[14px] font-semibold text-brass-soft active:cursor-grabbing"
          >
            <MousePointerClick className="h-4 w-4" /> 🧭 Enviar a Atlas
          </a>
          <span className="text-[12px] text-ink-lo">← arrastralo, no lo cliquees</span>
        </div>
        <p className="mt-2 text-[12px] text-ink-lo">
          En favoritos aparece con un ícono de globo genérico (un bookmarklet no tiene web
          propia, así que Chrome no le pone logo). El emoji 🧭 en el nombre lo hace
          reconocible; podés renombrarlo con clic derecho → Editar.
        </p>

        <ol start={3} className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-mid">
          <li>
            <span className="font-mono text-ink-lo">3 · </span>
            En una vacante: (opcional) seleccioná con el mouse el texto de la descripción,
            después clic en el favorito <strong className="text-ink-hi">Enviar a Atlas</strong>.
          </li>
          <li>
            <span className="font-mono text-ink-lo">4 · </span>
            Se abre Atlas en <strong className="text-ink-hi">Adaptar</strong> con el texto ya cargado.
            Revisás y adaptás.
          </li>
        </ol>

        <p className="well mt-4 rounded-lg p-3 text-[12.5px] leading-relaxed text-ink-lo">
          En la mayoría de los portales (Computrabajo, GetOnBoard, bolsas de trabajo, etc.)
          anda sin seleccionar nada. En <strong className="text-ink-mid">LinkedIn</strong> a veces
          el sitio bloquea estos botones: si no pasa nada, seleccioná el texto primero, y si
          igual falla, usá la extensión de abajo.
        </p>
      </section>

      {/* Extensión — power users */}
      <section className="card mt-6 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-mid">
          <Puzzle className="h-4 w-4" /> Opción con extensión · Chrome / Edge / Brave
        </div>
        <h2 className="mt-2 font-display text-[19px] font-semibold text-ink-hi">
          Extensión (un botón fijo en el navegador)
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mid">
          Más robusta en LinkedIn. Requiere unos pasos una sola vez.
        </p>
        <ol className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-mid">
          <li><span className="font-mono text-ink-lo">1 · </span>Pedile a quien administra Atlas la carpeta <span className="font-mono text-[12px] text-ink-hi">extension/</span> (o un .zip).</li>
          <li><span className="font-mono text-ink-lo">2 · </span>Abrí <span className="font-mono text-[12px] text-ink-hi">chrome://extensions</span> y activá <strong className="text-ink-hi">Modo de desarrollador</strong>.</li>
          <li><span className="font-mono text-ink-lo">3 · </span><strong className="text-ink-hi">Cargar descomprimida</strong> → elegí esa carpeta.</li>
          <li><span className="font-mono text-ink-lo">4 · </span>Fijá el ícono y clic en él cuando estés en una vacante.</li>
        </ol>
      </section>
    </div>
  );
}
