# Atlas — Enviar vacante (extensión de navegador)

Un botón en la barra de Chrome que agarra el texto de la vacante de la página
en la que estás y abre Atlas con ese texto ya cargado en **Adaptar**. Sin
scraping, sin backend: solo evita el copiar/pegar.

## Cómo funciona

1. Clic en el botón de la extensión mientras ves una vacante (LinkedIn,
   Computrabajo, GetOnBoard o cualquier página).
2. `extract.js` lee el contenedor de la descripción (con selectores por sitio y
   un fallback al texto del `body`).
3. Se abre `TU_ATLAS/adaptar#raw=<texto>`. El fragmento `#raw=` no viaja al
   servidor y aguanta varios KB. Atlas lo detecta, rellena el textarea y vos
   revisás y adaptás.

## Instalar (vos y tu círculo)

1. `background.js` ya apunta a `https://atlas-web-ten-liard.vercel.app` (`ATLAS_URL`).
   Cambialo solo si movés Atlas a otro dominio.
2. Chrome → `chrome://extensions` → activá **Modo de desarrollador**.
3. **Cargar descomprimida** → elegí esta carpeta `extension/`.
4. (Opcional) Fijá el ícono en la barra.

Para compartir: pasá la carpeta (o un `.zip`) y que repitan los pasos 2-4.
Si cambiás `ATLAS_URL`, hay que recargar la extensión desde `chrome://extensions`.

## Límites conocidos

- Los selectores por sitio se rompen si el portal cambia su HTML. Cuando eso
  pasa, la extensión igual manda el `body.innerText` completo — más ruidoso,
  pero funciona. Ajustá los selectores en `extract.js`.
- En páginas restringidas (`chrome://`, la Web Store) el botón abre Atlas vacío.
- Firefox: el `manifest.json` es MV3; funciona en Chrome/Edge/Brave. Para
  Firefox habría que agregar `browser_specific_settings` y usar `browser.*`.
