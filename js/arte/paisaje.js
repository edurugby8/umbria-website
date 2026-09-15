/**
 * Paisajes pintados por código.
 *
 * No hay ni una fotografía en el proyecto: las seis piezas de la galería, los
 * fondos de las tarjetas y la escena de la linterna se dibujan aquí, en un
 * lienzo 2D, a partir de una semilla. La misma semilla da siempre el mismo
 * bosque, así que la galería no baila entre visitas.
 *
 * La receta es la de un telón de teatro: varias capas de siluetas cada vez más
 * oscuras y más grandes, separadas por bandas de niebla. Lo que da sensación de
 * profundidad no son los árboles, es la niebla que se mete entre ellos.
 */

import { azarCon } from '../lib/util.js';

/** Cada hora del día trae su propio cielo, su niebla y su luz. */
const TONOS = {
  noche: {
    cielo: ['#0a1a16', '#071110', '#040807'],
    niebla: 'rgba(120, 170, 150, .10)',
    capas: ['#0d2a22', '#0b211b', '#081812', '#06100c', '#040a07'],
    suelo: '#030705',
    luz: 'rgba(150, 220, 180, .16)',
    rayos: 0.25,
    motas: 'rgba(190, 255, 170, .85)',
    nMotas: 34,
  },
  alba: {
    cielo: ['#3a4a3c', '#22332a', '#0d1913'],
    niebla: 'rgba(230, 225, 200, .22)',
    capas: ['#43604c', '#334c3c', '#24382c', '#16241c', '#0b120e'],
    suelo: '#080f0b',
    luz: 'rgba(240, 215, 160, .3)',
    rayos: 0.85,
    motas: 'rgba(250, 240, 210, .7)',
    nMotas: 18,
  },
  dia: {
    cielo: ['#6d8a66', '#3f5a44', '#16241b'],
    niebla: 'rgba(225, 235, 205, .16)',
    capas: ['#4e7353', '#3c5c43', '#2b4331', '#1a2b20', '#0c1410'],
    suelo: '#0a120c',
    luz: 'rgba(255, 240, 185, .34)',
    rayos: 1,
    motas: 'rgba(255, 248, 215, .6)',
    nMotas: 22,
  },
  ocaso: {
    cielo: ['#8a6440', '#4a3a2c', '#14180f'],
    niebla: 'rgba(235, 195, 140, .2)',
    capas: ['#5a4a33', '#43392a', '#2e2a1f', '#1b1a14', '#0c0d0a'],
    suelo: '#090a07',
    luz: 'rgba(255, 200, 120, .4)',
    rayos: 0.95,
    motas: 'rgba(255, 220, 160, .65)',
    nMotas: 16,
  },
};

/** Tronco con conicidad y una ligera curva: nada de rectángulos. */
function tronco(ctx, x, base, alto, grosor, inclina, azar) {
  const cima = base - alto;
  const desvio = inclina * alto;
  ctx.beginPath();
  ctx.moveTo(x - grosor, base);
  ctx.quadraticCurveTo(
    x - grosor * 0.6 + desvio * 0.4,
    base - alto * 0.5,
    x + desvio - grosor * 0.22,
    cima,
  );
  ctx.lineTo(x + desvio + grosor * 0.22, cima);
  ctx.quadraticCurveTo(
    x + grosor * 0.6 + desvio * 0.4,
    base - alto * 0.5,
    x + grosor,
    base,
  );
  ctx.closePath();
  ctx.fill();

  // Ramas: salen del tercio alto y se van hacia arriba
  const ramas = 2 + Math.floor(azar() * 3);
  for (let i = 0; i < ramas; i++) {
    const t = 0.45 + azar() * 0.5;
    const y = base - alto * t;
    const lado = azar() > 0.5 ? 1 : -1;
    const largo = alto * (0.12 + azar() * 0.22);
    const gr = grosor * (0.4 - t * 0.2);
    ctx.beginPath();
    ctx.moveTo(x + desvio * t - gr, y);
    ctx.quadraticCurveTo(
      x + desvio * t + lado * largo * 0.6,
      y - largo * 0.25,
      x + desvio * t + lado * largo,
      y - largo * 0.75,
    );
    ctx.lineTo(x + desvio * t + lado * largo * 0.96, y - largo * 0.62);
    ctx.quadraticCurveTo(
      x + desvio * t + lado * largo * 0.5,
      y - largo * 0.12,
      x + desvio * t + gr,
      y + gr,
    );
    ctx.closePath();
    ctx.fill();
  }
}

/** Mata de helecho: un abanico de frondes desde un punto. */
function helecho(ctx, x, y, escala, azar) {
  const frondes = 5 + Math.floor(azar() * 4);
  for (let i = 0; i < frondes; i++) {
    const ang = -Math.PI / 2 + (i / (frondes - 1) - 0.5) * 2.1 + (azar() - 0.5) * 0.2;
    const largo = escala * (0.7 + azar() * 0.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(largo * 0.35, -escala * 0.1, largo, -escala * 0.16);
    ctx.quadraticCurveTo(largo * 0.4, escala * 0.05, 0, escala * 0.06);
    ctx.closePath();
    ctx.fill();
    // Foliolos: pequeños dientes a lo largo del fronde
    const n = 7;
    for (let j = 1; j <= n; j++) {
      const t = j / (n + 1);
      const px = largo * t;
      const py = -escala * 0.1 * t;
      const s = escala * 0.13 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.ellipse(px, py - s * 0.6, s * 0.9, s * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Banda de niebla horizontal, con su propia altura y suavidad. */
function niebla(ctx, w, h, y, alto, color) {
  const g = ctx.createLinearGradient(0, y - alto, 0, y + alto);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.5, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - alto, w, alto * 2);
}

/**
 * Pinta un paisaje completo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w @param {number} h
 * @param {{semilla:number, tono:keyof TONOS, rayos?:boolean, motas?:boolean}} opciones
 */
export function pintarPaisaje(ctx, w, h, { semilla = 1, tono = 'dia', motas = true } = {}) {
  const azar = azarCon(semilla * 2654435761);
  const t = TONOS[tono] ?? TONOS.dia;
  const horizonte = h * (0.62 + azar() * 0.1);

  // ── Cielo ──────────────────────────────────────────────────────────
  const cielo = ctx.createLinearGradient(0, 0, 0, h);
  cielo.addColorStop(0, t.cielo[0]);
  cielo.addColorStop(0.55, t.cielo[1]);
  cielo.addColorStop(1, t.cielo[2]);
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, w, h);

  // Halo de luz: por dónde entra el sol entre las copas
  const lx = w * (0.2 + azar() * 0.6);
  const halo = ctx.createRadialGradient(lx, h * 0.12, 0, lx, h * 0.12, h * 0.75);
  halo.addColorStop(0, t.luz);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // ── Capas de arbolado, de lejos a cerca ────────────────────────────
  const capas = t.capas.length;
  for (let c = 0; c < capas; c++) {
    const p = c / (capas - 1);
    const base = horizonte + (h - horizonte) * p * 0.85;
    const alto = h * (0.42 + p * 0.55);
    const grosor = w * (0.006 + p * 0.022);
    const cuantos = Math.round(14 - p * 8);

    ctx.fillStyle = t.capas[c];
    for (let i = 0; i < cuantos; i++) {
      const x = ((i + azar() * 0.9) / cuantos) * w * 1.18 - w * 0.09;
      tronco(
        ctx,
        x,
        base + azar() * h * 0.04,
        alto * (0.75 + azar() * 0.5),
        grosor * (0.7 + azar() * 0.6),
        (azar() - 0.5) * 0.12,
        azar,
      );
    }

    // La niebla se mete ENTRE capas: es lo que separa los planos
    if (c < capas - 1) {
      niebla(ctx, w, h, base - h * 0.02, h * (0.14 - p * 0.05), t.niebla);
    }
  }

  // ── Rayos de luz ───────────────────────────────────────────────────
  if (t.rayos > 0.1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const nRayos = 3;
    for (let i = 0; i < nRayos; i++) {
      const x0 = lx + (azar() - 0.5) * w * 0.3;
      const ancho = w * (0.04 + azar() * 0.08);
      const inclina = (azar() - 0.4) * w * 0.35;
      const g = ctx.createLinearGradient(x0, 0, x0 + inclina, h * 0.95);
      g.addColorStop(0, t.luz);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.5 * t.rayos;
      ctx.beginPath();
      ctx.moveTo(x0 - ancho * 0.35, -10);
      ctx.lineTo(x0 + ancho * 0.35, -10);
      ctx.lineTo(x0 + inclina + ancho, h * 0.98);
      ctx.lineTo(x0 + inclina - ancho, h * 0.98);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Suelo y sotobosque ─────────────────────────────────────────────
  const suelo = ctx.createLinearGradient(0, h * 0.72, 0, h);
  suelo.addColorStop(0, 'transparent');
  suelo.addColorStop(0.45, t.suelo);
  suelo.addColorStop(1, t.suelo);
  ctx.fillStyle = suelo;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  ctx.fillStyle = t.capas[capas - 1];
  const matas = 9;
  for (let i = 0; i < matas; i++) {
    const x = (i / (matas - 1)) * w * 1.1 - w * 0.05 + (azar() - 0.5) * w * 0.08;
    helecho(ctx, x, h * (0.94 + azar() * 0.08), h * (0.1 + azar() * 0.09), azar);
  }

  // ── Motas de luz en suspensión ─────────────────────────────────────
  if (motas) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < t.nMotas; i++) {
      const x = azar() * w;
      const y = h * (0.12 + azar() * 0.78);
      const r = Math.max(1, h * (0.0015 + azar() * 0.005));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      g.addColorStop(0, t.motas);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Viñeta ─────────────────────────────────────────────────────────
  const vin = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.78);
  vin.addColorStop(0, 'transparent');
  vin.addColorStop(1, 'rgba(3, 6, 4, .72)');
  ctx.fillStyle = vin;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Dibuja en un `<canvas>` ya colocado en el documento, ajustando la resolución
 * a su tamaño real y a la densidad de la pantalla.
 */
export function pintarEn(lienzo, opciones, dprMax = 2) {
  const caja = lienzo.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  const w = Math.max(2, Math.round((caja.width || 800) * dpr));
  const h = Math.max(2, Math.round((caja.height || 600) * dpr));
  if (lienzo.width !== w || lienzo.height !== h) {
    lienzo.width = w;
    lienzo.height = h;
  }
  const ctx = lienzo.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  pintarPaisaje(ctx, w, h, opciones);
}

/** Versión suelta, para usar como textura o como imagen de fondo. */
export function lienzoPaisaje(w, h, opciones) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) pintarPaisaje(ctx, w, h, opciones);
  return c;
}
