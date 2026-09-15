/**
 * Texto en marquesina.
 *
 * El contenido se duplica hasta cubrir dos veces el ancho de la pantalla y se
 * desplaza con un `transform` en bucle: sin saltos y sin recalcular nada por
 * fotograma. Con movimiento reducido se queda quieta y legible.
 */

import { MARQUESINA } from '../datos.js';

export function montarMarquesina({ reducido }) {
  const pista = document.getElementById('marquesina-pista');
  if (!pista) return null;

  const grupo = () => {
    const div = document.createElement('div');
    div.className = 'marquesina__grupo';
    div.innerHTML = MARQUESINA.map(
      (voz) =>
        `<span class="marquesina__voz">${voz}</span><span class="marquesina__voz marquesina__sep" aria-hidden="true">✦</span>`,
    ).join('');
    return div;
  };

  pista.append(grupo());
  const anchoGrupo = pista.firstElementChild.getBoundingClientRect().width || 800;
  const copias = Math.max(2, Math.ceil((window.innerWidth * 2) / anchoGrupo));
  for (let i = 1; i < copias; i++) pista.append(grupo());

  if (reducido) return null;

  let x = 0;
  let raf = 0;
  let anterior = performance.now();
  let velocidad = 34; // px por segundo
  let activo = true;

  function bucle() {
    raf = requestAnimationFrame(bucle);
    const ahora = performance.now();
    const dt = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.25);
    anterior = ahora;
    if (!activo) return;
    x -= velocidad * dt;
    if (x <= -anchoGrupo) x += anchoGrupo;
    pista.style.transform = `translate3d(${x}px, 0, 0)`;
  }
  raf = requestAnimationFrame(bucle);

  return {
    set movimiento(v) {
      activo = !!v;
      anterior = performance.now();
    },
    parar() {
      cancelAnimationFrame(raf);
    },
  };
}
