/**
 * Utilidades compartidas: interpolación, curvas y lectura del equipo.
 */

export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Interpolación exponencial independiente de la frecuencia de refresco.
 * El delta SIEMPRE llega acotado por los dos lados desde el bucle: con un
 * delta negativo esto se convierte en una exponencial creciente.
 */
export const damp = (actual, objetivo, lambda, dt) =>
  actual + (objetivo - actual) * (1 - Math.exp(-lambda * dt));

export const suave = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const salidaCubica = (t) => 1 - Math.pow(1 - t, 3);
export const entradaSalida = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Ruido de valor barato y repetible. Suficiente para dispersar cosas. */
export function ruido(x, y = 0, semilla = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + semilla * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Generador con semilla, para que el paisaje salga igual en cada visita. */
export function azarCon(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const reducido = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const punteroFino = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Tres niveles de calidad. Lo que cambia entre ellos es la cantidad de
 * geometría y de partículas, no el aspecto: en el nivel bajo la escena sigue
 * siendo la misma, con menos hojas y menos polen.
 */
export function medirEquipo() {
  const nucleos = navigator.hardwareConcurrency || 4;
  const memoria = navigator.deviceMemory || 4;
  const dpr = window.devicePixelRatio || 1;
  const ancho = window.innerWidth;
  const finoPunto = punteroFino();

  let nivel = 'alto';
  if (nucleos <= 4 || memoria <= 4 || ancho < 760) nivel = 'medio';
  if (nucleos <= 2 || memoria <= 2 || (ancho < 500 && dpr > 2)) nivel = 'bajo';

  const webgl = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();

  return {
    nivel,
    webgl,
    punteroFino: finoPunto,
    dpr: nivel === 'alto' ? Math.min(dpr, 2) : nivel === 'medio' ? Math.min(dpr, 1.6) : 1,
    polen: nivel === 'alto' ? 900 : nivel === 'medio' ? 420 : 180,
    luciernagas: nivel === 'alto' ? 54 : nivel === 'medio' ? 30 : 14,
    arboles: nivel === 'alto' ? 90 : nivel === 'medio' ? 52 : 26,
    helechos: nivel === 'alto' ? 70 : nivel === 'medio' ? 36 : 16,
    nieblas: nivel === 'alto' ? 9 : nivel === 'medio' ? 6 : 4,
    rayos: nivel === 'alto' ? 5 : nivel === 'medio' ? 3 : 2,
    antialias: nivel !== 'bajo',
  };
}
