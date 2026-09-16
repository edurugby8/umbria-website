/**
 * UMBRÍA — arranque.
 *
 * Orden de las cosas:
 *   1. Se mide el equipo y la preferencia de movimiento.
 *   2. Se monta el bosque (o su alternativa plana si no hay WebGL).
 *   3. Se construye el contenido que vive en datos.js.
 *   4. Se enciende la interfaz: cursor, marquesina, linterna, revelados.
 *   5. Se retira la pantalla de carga y arranca la entrada.
 *
 * La pantalla de carga NUNCA se queda pegada: si algo fallara por el camino,
 * un temporizador la retira igual y la página se queda usable.
 */

import './estilos/estilo.css';

import { medirEquipo, reducido as pideReducido } from './lib/util.js';
import { montarBosque } from './bosque/escena.js';
import { montarCursor } from './ui/cursor.js';
import { montarMarquesina } from './ui/marquesina.js';
import { montarLinterna } from './ui/linterna.js';
import { montarTarjetas, montarGaleria } from './ui/contenido.js';
import { montarRevelados } from './ui/revelados.js';

const raiz = document.documentElement;
const caps = medirEquipo();
const mqReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducido = pideReducido();

raiz.dataset.nivel = caps.nivel;
if (!reducido) raiz.dataset.anima = 'si';

/* ── Pantalla de carga ─────────────────────────────────────────────── */

const carga = document.getElementById('carga');
const barra = document.getElementById('carga-progreso');
const pct = document.getElementById('carga-pct');
let progreso = 0;
let cerrada = false;

function avanzarCarga(v) {
  progreso = Math.max(progreso, Math.min(1, v));
  barra?.style.setProperty('--p', progreso.toFixed(3));
  if (pct) pct.textContent = `${Math.round(progreso * 100)}%`;
}

function cerrarCarga() {
  if (cerrada) return;
  cerrada = true;
  avanzarCarga(1);
  setTimeout(() => {
    carga?.setAttribute('data-listo', '');
    bosque?.entrar();
    revelados?.entradaHero();
    // Se quita del árbol para que no atrape el foco al tabular
    setTimeout(() => carga?.remove(), 1100);
  }, reducido ? 0 : 280);
}

// Red de seguridad: pase lo que pase, a los 4,5 s la página está a la vista
const reserva = setTimeout(cerrarCarga, 4500);

/* ── Escena ────────────────────────────────────────────────────────── */

const lienzo = document.getElementById('lienzo');
const sinWebgl = document.getElementById('sin-webgl');
let bosque = null;

avanzarCarga(0.15);

if (caps.webgl && lienzo) {
  try {
    bosque = montarBosque({
      contenedor: lienzo,
      caps,
      reducido,
      // En cuanto hay un fotograma del bosque en pantalla, fuera la carga
      alPintar: () => setTimeout(cerrarCarga, reducido ? 0 : 260),
    });
  } catch (e) {
    console.warn('No se pudo montar el bosque en 3D:', e);
  }
}
if (!bosque) {
  lienzo?.remove();
  sinWebgl?.removeAttribute('hidden');
}
avanzarCarga(0.55);

/* ── Contenido ─────────────────────────────────────────────────────── */

montarTarjetas();
montarGaleria();
avanzarCarga(0.75);

/* ── Interfaz ──────────────────────────────────────────────────────── */

const cursor = montarCursor({ reducido });
const marquesina = montarMarquesina({ reducido });
montarLinterna({ reducido });

const revelados = montarRevelados({
  reducido,
  alCambiarSeccion(id) {
    document.querySelectorAll('.nav__lista a[data-seccion]').forEach((a) => {
      a.toggleAttribute('data-activa', a.dataset.seccion === id);
    });
  },
});

avanzarCarga(0.92);

/* ── Paralaje de puntero ───────────────────────────────────────────── */

if (!reducido) {
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      bosque?.puntero((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
  window.addEventListener('pointerleave', () => bosque?.puntero(0, 0));

  // En móvil, el giroscopio no: consume permiso y marea. Basta con el scroll.
}

/* ── Panel de ajustes (sólo para afinar, no va en la versión pública) ──
   Se carga con `import()` dinámico y sólo si la dirección lleva `?ajustes`,
   así que no pesa un byte en la visita normal. */
if (new URLSearchParams(location.search).has('ajustes')) {
  import('./ui/panel.js')
    .then((m) => m.montarPanel(bosque))
    .catch((e) => console.warn('Panel de ajustes no disponible:', e));
}

/* ── Cabecera compacta ─────────────────────────────────────────────── */

const nav = document.getElementById('nav');
const alDesplazar = () => {
  nav?.toggleAttribute('data-compacta', window.scrollY > 40);
};
window.addEventListener('scroll', alDesplazar, { passive: true });
alDesplazar();

/* ── Control de movimiento ─────────────────────────────────────────── */

const control = document.getElementById('control-movimiento');
let pausado = false;

function aplicarMovimiento() {
  const quieto = pausado || reducido;
  raiz.dataset.movimiento = quieto ? 'quieto' : 'vivo';
  if (bosque) bosque.movimiento = !quieto;
  if (marquesina) marquesina.movimiento = !quieto;
  if (!control) return;
  control.setAttribute('aria-pressed', String(pausado));
  const texto = control.querySelector('.control__texto');
  if (reducido) {
    control.disabled = true;
    if (texto) texto.textContent = 'Movimiento detenido por tu sistema';
  } else if (texto) {
    texto.textContent = pausado ? 'Reanudar movimiento' : 'Pausar movimiento';
  }
}

control?.addEventListener('click', () => {
  pausado = !pausado;
  try {
    localStorage.setItem('umbria:movimiento', pausado ? 'quieto' : 'vivo');
  } catch {
    /* modo privado: la preferencia vale para esta visita */
  }
  aplicarMovimiento();
});

try {
  pausado = localStorage.getItem('umbria:movimiento') === 'quieto';
} catch {
  pausado = false;
}
aplicarMovimiento();

// Si el visitante cambia la preferencia del sistema a mitad de visita
mqReducido.addEventListener?.('change', (e) => {
  reducido = e.matches;
  if (reducido) raiz.removeAttribute('data-anima');
  aplicarMovimiento();
});

/* ── Anclajes y «Volver a entrar» ──────────────────────────────────── */

/*
 * El desplazamiento es el NATIVO del navegador, a propósito.
 *
 * Aquí hubo una amortiguación propia al estilo Lenis. Se ha quitado: para
 * suavizar la rueda hay que interceptarla con `preventDefault`, y en cuanto se
 * hace eso la página deja de responder como el visitante espera —se queda
 * atrás, se pelea con la barra de desplazamiento y con el teclado, y en algunos
 * navegadores y marcos directamente no baja—. El recorrido ya va amortiguado
 * donde importa, que es la cámara del bosque; la página, no se toca.
 *
 * Los anclajes sí van suaves, pero con `scroll-behavior`, que es cosa del
 * navegador y no roba nada.
 */
document.querySelectorAll('a[href^="#"]').forEach((enlace) => {
  enlace.addEventListener('click', (e) => {
    const destino = document.querySelector(enlace.getAttribute('href'));
    if (!destino) return;
    e.preventDefault();
    const y = destino.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' });
  });
});

document.getElementById('volver')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  // La entrada se repite cuando ya se ha llegado arriba
  const esperar = setInterval(() => {
    if (window.scrollY < 6) {
      clearInterval(esperar);
      bosque?.entrar();
    }
  }, 120);
  setTimeout(() => clearInterval(esperar), 4000);
});

/* ── Reflejo de los botones bajo el cursor ─────────────────────────── */

document.querySelectorAll('.boton').forEach((b) => {
  b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
    b.style.setProperty('--by', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
});

/* ── Cierre ────────────────────────────────────────────────────────── */

const anio = document.getElementById('anio');
if (anio) anio.textContent = String(new Date().getFullYear());

// Las alturas cambian cuando entran las tipografías: hay que volver a medir
document.fonts?.ready.then(() => {
  bosque?.medir();
  revelados?.refrescar();
});

window.addEventListener('load', () => {
  clearTimeout(reserva);
  bosque?.medir();
  revelados?.refrescar();
  // Un respiro para que el primer fotograma del bosque ya esté pintado
  setTimeout(cerrarCarga, reducido ? 0 : 420);
});

// Si no hubiera 3D que esperar (o `load` no llegara), la carga se cierra igual
setTimeout(cerrarCarga, 2000);

export { bosque, cursor };
