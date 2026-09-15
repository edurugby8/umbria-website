/**
 * La linterna.
 *
 * Dos paisajes del mismo sitio superpuestos: abajo la versión nocturna, casi a
 * ciegas; encima la versión iluminada, recortada por una máscara radial que
 * sigue al puntero. Lo que descubre no es un filtro sobre la misma imagen: son
 * dos pinturas distintas, así que aparecen cosas que de noche no estaban.
 *
 * Sin puntero —o en cuanto se deja de mover— la luz deriva sola en una figura
 * de ocho, para que la sección no quede muerta en táctil.
 */

import { pintarEn } from '../arte/paisaje.js';
import { clamp } from '../lib/util.js';

export function montarLinterna({ reducido }) {
  const visor = document.getElementById('visor');
  const noche = document.getElementById('visor-noche');
  const luz = document.getElementById('visor-luz');
  if (!visor || !noche || !luz) return null;

  const SEMILLA = 88;
  let ancho = 0;
  let alto = 0;

  function repintar() {
    const caja = visor.getBoundingClientRect();
    if (!caja.width) return;
    ancho = caja.width;
    alto = caja.height;
    pintarEn(noche, { semilla: SEMILLA, tono: 'noche' }, 1.6);
    // La capa descubierta va en tono cálido: una linterna da luz ámbar, y el
    // contraste con el verde de la noche es lo que hace que se lea el haz.
    pintarEn(luz, { semilla: SEMILLA, tono: 'ocaso' }, 1.6);
  }

  // Sólo se pinta cuando la sección se acerca: son dos lienzos grandes
  let pintado = false;
  const vigia = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting && !pintado) {
          pintado = true;
          repintar();
        }
      }
    },
    { rootMargin: '200px' },
  );
  vigia.observe(visor);

  let redibujo;
  window.addEventListener('resize', () => {
    clearTimeout(redibujo);
    redibujo = setTimeout(() => pintado && repintar(), 180);
  });

  // ── Posición de la luz ─────────────────────────────────────────────
  let x = 0.5;
  let y = 0.5;
  let vx = 0.5;
  let vy = 0.5;
  let guiada = false;
  let ultimoToque = 0;
  let raf = 0;
  let reloj = 0;
  let anterior = performance.now();

  const radio = () => Math.max(140, Math.min(ancho, alto) * 0.4);

  function aplicar() {
    luz.style.setProperty('--x', `${(vx * 100).toFixed(2)}%`);
    luz.style.setProperty('--y', `${(vy * 100).toFixed(2)}%`);
    luz.style.setProperty('--r', `${radio().toFixed(0)}px`);
  }

  function alApuntar(e) {
    const caja = visor.getBoundingClientRect();
    x = clamp((e.clientX - caja.left) / caja.width);
    y = clamp((e.clientY - caja.top) / caja.height);
    guiada = true;
    ultimoToque = performance.now();
    visor.dataset.explorando = 'si';
  }

  visor.addEventListener('pointermove', alApuntar, { passive: true });
  visor.addEventListener('pointerdown', alApuntar, { passive: true });
  visor.addEventListener('pointerleave', () => {
    guiada = false;
  });

  function bucle() {
    raf = requestAnimationFrame(bucle);
    const ahora = performance.now();
    const dt = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.25);
    anterior = ahora;

    // Si nadie la lleva desde hace un rato, la luz se pasea sola
    if (!guiada || ahora - ultimoToque > 2200) {
      reloj += dt;
      x = 0.5 + Math.sin(reloj * 0.42) * 0.3;
      y = 0.5 + Math.sin(reloj * 0.73) * 0.22;
      if (!guiada) visor.removeAttribute('data-explorando');
    }

    const k = reducido ? 1 : 0.14;
    vx += (x - vx) * k;
    vy += (y - vy) * k;
    aplicar();
  }

  aplicar();
  if (reducido) {
    // Con movimiento reducido no hay paseo: una luz fija, grande y quieta
    vx = 0.5;
    vy = 0.45;
    luz.style.setProperty('--r', '460px');
    aplicar();
  } else {
    raf = requestAnimationFrame(bucle);
  }

  return {
    parar() {
      cancelAnimationFrame(raf);
      vigia.disconnect();
    },
  };
}
