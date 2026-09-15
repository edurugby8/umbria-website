/**
 * Construye las tarjetas de las sendas y la galería a partir de `datos.js`.
 *
 * Los fondos son paisajes pintados por código, no fotografías. Cada pieza se
 * pinta cuando está a punto de entrar en pantalla: doce lienzos a la vez al
 * arrancar se notarían.
 */

import { SENDAS, GALERIA } from '../datos.js';
import { pintarEn } from '../arte/paisaje.js';

/**
 * Pinta el lienzo de un elemento cuando se acerca a la ventana, y avisa: al
 * aparecer contenido cambia la altura del documento, y si ScrollTrigger no
 * vuelve a medir, los revelados de más abajo se disparan donde no toca.
 */
let remedir;
function avisarDeCambio() {
  clearTimeout(remedir);
  remedir = setTimeout(() => window.ScrollTrigger?.refresh(), 220);
}

function alAcercarse(elemento, pintar) {
  const vigia = new IntersectionObserver(
    (entradas, obs) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        pintar();
        avisarDeCambio();
        obs.unobserve(e.target);
      }
    },
    { rootMargin: '300px' },
  );
  vigia.observe(elemento);
  return vigia;
}

export function montarTarjetas() {
  const caja = document.getElementById('tarjetas');
  if (!caja) return;

  const vigias = [];

  SENDAS.forEach((senda, i) => {
    const art = document.createElement('article');
    art.className = 'tarjeta';
    art.innerHTML = `
      <canvas class="tarjeta__lienzo" aria-hidden="true"></canvas>
      <span class="tarjeta__velo" aria-hidden="true"></span>
      <p class="tarjeta__num">${senda.num}</p>
      <div class="tarjeta__cuerpo">
        <h3 class="tarjeta__nombre">${senda.nombre}</h3>
        <p class="tarjeta__texto">${senda.texto}</p>
        <p class="tarjeta__meta">${senda.meta.map((m) => `<span>${m}</span>`).join('')}</p>
      </div>`;
    caja.append(art);

    const lienzo = art.querySelector('.tarjeta__lienzo');
    const tonos = ['alba', 'dia', 'noche'];
    vigias.push(
      alAcercarse(art, () =>
        pintarEn(lienzo, { semilla: senda.semilla, tono: tonos[i % tonos.length] }, 1.4),
      ),
    );

    // Inclinación 3D al pasar por encima: el reflejo sigue al cursor
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      art.style.setProperty('--bx', `${px * 100}%`);
      art.style.setProperty('--by', `${py * 100}%`);
      art.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 7}deg) translateY(-4px)`;
    });
    art.addEventListener('pointerleave', () => {
      art.style.transform = '';
    });
  });

  return vigias;
}

export function montarGaleria() {
  const rejilla = document.getElementById('galeria-rejilla');
  if (!rejilla) return;

  GALERIA.forEach((pieza) => {
    const fig = document.createElement('figure');
    fig.className = `pieza ${pieza.clase}`;
    fig.innerHTML = `
      <canvas class="pieza__lienzo" aria-hidden="true"></canvas>
      <figcaption class="pieza__marco">
        <span class="pieza__hora">${pieza.hora}</span>
        <p class="pieza__nombre">${pieza.nombre}</p>
      </figcaption>`;
    rejilla.append(fig);

    const lienzo = fig.querySelector('.pieza__lienzo');
    // Las piezas altas y anchas necesitan más resolución que las pequeñas
    alAcercarse(fig, () => pintarEn(lienzo, { semilla: pieza.semilla, tono: pieza.tono }, 1.5));
  });
}
