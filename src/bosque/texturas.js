/**
 * Texturas del bosque, dibujadas en lienzo 2D al arrancar.
 *
 * Ninguna se descarga: así la página funciona sin conexión y no hay dudas de
 * licencia sobre las imágenes.
 */

import * as THREE from 'three';
import { azarCon } from '../lib/util.js';

function lienzo(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) pintar(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/**
 * Texturas de recorte (`alphaTest`).
 *
 * Con mipmaps, un árbol lejano se lee de un nivel muy reducido en el que el
 * alfa del hueco y el del tronco ya se han promediado: el resultado supera el
 * umbral y se pinta EL CUADRADO ENTERO. Es el artefacto clásico del alphaTest,
 * y en una escena con niebla se ve como paneles pálidos flotando al fondo.
 *
 * Se resuelve renunciando a los mipmaps en las texturas recortadas: son
 * siluetas grandes y con niebla encima, así que el poco aliasing que aparece
 * no se nota, y los rectángulos desaparecen.
 */
function sinMipmaps(t) {
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Silueta de árbol en blanco sobre transparente. La escena la tiñe de oscuro:
 * lo que importa aquí es la FORMA, y que el canto quede suave para que el
 * recorte no se vea.
 */
export function texturaArbol(semilla = 1) {
  return sinMipmaps(lienzo(256, 512, (ctx, w, h) => {
    const azar = azarCon(semilla * 9176);
    ctx.fillStyle = '#ffffff';
    const cx = w / 2;
    const grosor = w * (0.045 + azar() * 0.03);

    // Tronco, con conicidad y curva
    const desvio = (azar() - 0.5) * w * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - grosor * 1.5, h);
    ctx.quadraticCurveTo(cx - grosor, h * 0.5, cx + desvio - grosor * 0.4, h * 0.1);
    ctx.lineTo(cx + desvio + grosor * 0.4, h * 0.1);
    ctx.quadraticCurveTo(cx + grosor, h * 0.5, cx + grosor * 1.5, h);
    ctx.closePath();
    ctx.fill();

    // Ramas
    const ramas = 4 + Math.floor(azar() * 4);
    for (let i = 0; i < ramas; i++) {
      const t = 0.12 + azar() * 0.55;
      const y = h * t;
      const lado = azar() > 0.5 ? 1 : -1;
      const largo = w * (0.22 + azar() * 0.28);
      const gr = grosor * (0.55 - t * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx + desvio * (1 - t) - gr, y);
      ctx.quadraticCurveTo(
        cx + lado * largo * 0.55,
        y - largo * 0.35,
        cx + lado * largo,
        y - largo * 0.7,
      );
      ctx.lineTo(cx + lado * largo * 0.94, y - largo * 0.55);
      ctx.quadraticCurveTo(cx + lado * largo * 0.4, y - largo * 0.02, cx + desvio * (1 - t) + gr, y + gr * 2);
      ctx.closePath();
      ctx.fill();
    }

    // Copa: manchas de hoja que se comen el canto recto de las ramas
    const hojas = 26;
    for (let i = 0; i < hojas; i++) {
      const a = azar() * Math.PI * 2;
      const r = azar();
      const x = cx + Math.cos(a) * w * 0.44 * r;
      const y = h * 0.2 - Math.sin(a) * h * 0.2 * r;
      const s = w * (0.07 + azar() * 0.1);
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * (0.55 + azar() * 0.35), azar() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }));
}

/** Mata de helecho para el primer plano del sotobosque. */
export function texturaHelecho(semilla = 1) {
  // 512, no 256: estos recortes llegan a pasar a metro y medio del objetivo y
  // a esa distancia un alfa de 256 px se ve como una escalera.
  return sinMipmaps(lienzo(512, 512, (ctx, w, h) => {
    const azar = azarCon(semilla * 5531);
    ctx.fillStyle = '#ffffff';
    const frondes = 7 + Math.floor(azar() * 5);
    for (let i = 0; i < frondes; i++) {
      const ang = -Math.PI / 2 + (i / (frondes - 1) - 0.5) * 2.3;
      const largo = h * (0.55 + azar() * 0.42);
      ctx.save();
      ctx.translate(w / 2, h);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(largo * 0.4, -h * 0.05, largo, -h * 0.03);
      ctx.quadraticCurveTo(largo * 0.4, h * 0.05, 0, h * 0.03);
      ctx.closePath();
      ctx.fill();
      const n = 9;
      for (let j = 1; j <= n; j++) {
        const t = j / (n + 1);
        const s = h * 0.055 * (1 - t * 0.55);
        ctx.beginPath();
        ctx.ellipse(largo * t, -s * 0.5, s, s * 0.42, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(largo * t, s * 0.5, s, s * 0.42, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }));
}

/** Jirón de niebla: una mancha suave, irregular y muy transparente. */
export function texturaNiebla(semilla = 1) {
  return lienzo(256, 128, (ctx, w, h) => {
    const azar = azarCon(semilla * 3301);
    for (let i = 0; i < 16; i++) {
      const x = azar() * w;
      const y = h * (0.3 + azar() * 0.4);
      const r = h * (0.35 + azar() * 0.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.13)');
      g.addColorStop(0.5, 'rgba(255,255,255,.06)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    /* Los CUATRO bordes se apagan. Con apagar sólo los lados, el plano se
       delataba como un rectángulo pálido flotando entre los árboles. */
    ctx.globalCompositeOperation = 'destination-out';
    const lados = ctx.createLinearGradient(0, 0, w, 0);
    lados.addColorStop(0, 'rgba(0,0,0,1)');
    lados.addColorStop(0.3, 'rgba(0,0,0,0)');
    lados.addColorStop(0.7, 'rgba(0,0,0,0)');
    lados.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = lados;
    ctx.fillRect(0, 0, w, h);
    const arribaAbajo = ctx.createLinearGradient(0, 0, 0, h);
    arribaAbajo.addColorStop(0, 'rgba(0,0,0,1)');
    arribaAbajo.addColorStop(0.42, 'rgba(0,0,0,0)');
    arribaAbajo.addColorStop(0.58, 'rgba(0,0,0,0)');
    arribaAbajo.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = arribaAbajo;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Mota redonda y suave: sirve para el polen y para las luciérnagas. */
export function texturaMota() {
  return lienzo(64, 64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Hoja suelta, para las que caen. Va con su nervadura, que al girar se nota. */
export function texturaHoja() {
  return lienzo(64, 64, (ctx, s) => {
    const c = s / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c, s * 0.08);
    ctx.bezierCurveTo(s * 0.95, s * 0.3, s * 0.88, s * 0.78, c, s * 0.94);
    ctx.bezierCurveTo(s * 0.12, s * 0.78, s * 0.05, s * 0.3, c, s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(c, s * 0.12);
    ctx.lineTo(c, s * 0.9);
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const y = s * (0.22 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(c, y);
      ctx.lineTo(c + s * 0.22, y + s * 0.09);
      ctx.moveTo(c, y);
      ctx.lineTo(c - s * 0.22, y + s * 0.09);
      ctx.stroke();
    }
  });
}

/** Rayo de luz: una banda vertical que se apaga hacia abajo y hacia los lados. */
export function texturaRayo() {
  return lienzo(128, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(0.45, 'rgba(255,255,255,.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const lados = ctx.createLinearGradient(0, 0, w, 0);
    lados.addColorStop(0, 'rgba(0,0,0,1)');
    lados.addColorStop(0.5, 'rgba(0,0,0,0)');
    lados.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = lados;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Cielo. Sin un fondo propio, por encima del horizonte se veía el degradado
 * de CSS a través del lienzo y la línea del suelo quedaba como un corte seco.
 * El color de la niebla se elige para casar con la banda del horizonte, de
 * modo que lo lejano se funde en él en vez de recortarse.
 */
export function texturaCielo() {
  const t = lienzo(4, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    /* Fase 3 · El cielo era casi negro y arrastraba a toda la escena con él:
       con la niebla casada a un horizonte oscuro, lo lejano no se fundía, se
       tragaba. Ahora la banda del horizonte es una neblina CLARA —la de un
       hayedo a media mañana— y los troncos se recortan contra ella. Iluminar
       el fondo es lo que deja subir los verdes sin perder la silueta. */
    g.addColorStop(0, '#12281c');
    g.addColorStop(0.30, '#21462f');
    g.addColorStop(0.60, '#456f52');   // banda del horizonte: la niebla con sol
    g.addColorStop(0.74, '#2e5138');
    g.addColorStop(1, '#16281c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* --------------------------------------------------------------------------
   Fase 2 · texturas para el arbolado con geometría
   -------------------------------------------------------------------------- */

/** Repetible en las dos direcciones, para envolver troncos y cubrir el suelo. */
function repetible(t, x = 1, y = 1) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
}

/**
 * Corteza. Vetas verticales con musgo prendido en el lado de sombra: es una
 * umbría, y ahí el musgo crece en el tronco, no sólo en el suelo.
 * Se tiñe por instancia desde la escena, así que aquí interesa el RELIEVE,
 * no el color: la textura es casi gris.
 */
export function texturaCorteza() {
  const t = lienzo(256, 512, (ctx, w, h) => {
    const azar = azarCon(9001);
    ctx.fillStyle = '#8a8a86';
    ctx.fillRect(0, 0, w, h);

    // Vetas: tiras verticales con grietas
    for (let i = 0; i < 120; i++) {
      const x = azar() * w;
      const ancho = w * (0.008 + azar() * 0.035);
      const claro = azar() > 0.5;
      ctx.fillStyle = claro
        ? `rgba(255,255,255,${0.04 + azar() * 0.1})`
        : `rgba(0,0,0,${0.06 + azar() * 0.18})`;
      let y = -h * 0.1;
      while (y < h) {
        const largo = h * (0.12 + azar() * 0.35);
        ctx.fillRect(x + (azar() - 0.5) * w * 0.012, y, ancho, largo);
        y += largo + h * 0.02 * azar();
      }
    }

    // Musgo: manchas verdosas, agrupadas hacia un lado
    for (let i = 0; i < 44; i++) {
      const x = (azar() * 0.55 + 0.05) * w;
      const y = azar() * h;
      const r = w * (0.03 + azar() * 0.09);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(120,150,110,${0.16 + azar() * 0.2})`);
      g.addColorStop(1, 'rgba(120,150,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return repetible(t, 2, 1);
}

/**
 * Racimo de follaje. No es una hoja suelta: es un puñado de hojas solapadas
 * con el canto comido, que es lo que evita que la copa se lea como un recorte.
 */
export function texturaFollaje(semilla = 1) {
  return sinMipmaps(
    lienzo(256, 256, (ctx, w, h) => {
      const azar = azarCon(semilla * 7723);
      ctx.fillStyle = '#ffffff';
      const hojas = 34;
      for (let i = 0; i < hojas; i++) {
        // Se agrupan hacia el centro con caída suave hacia los bordes
        const a = azar() * Math.PI * 2;
        const r = Math.pow(azar(), 0.62) * w * 0.44;
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r * 0.82;
        const s = w * (0.05 + azar() * 0.085);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(azar() * Math.PI);
        ctx.globalAlpha = 0.72 + azar() * 0.28;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.9, -s * 0.3, s * 0.75, s * 0.6, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.6, -s * 0.9, -s * 0.3, 0, -s);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // El canto se deshilacha para que no quede un contorno de galleta
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 90; i++) {
        const a = azar() * Math.PI * 2;
        const r = w * (0.34 + azar() * 0.2);
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r * 0.85;
        const s = w * (0.03 + azar() * 0.07);
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );
}

/**
 * Suelo: hojarasca sobre musgo. Va muy apagada a propósito — con la niebla
 * encima, lo único que tiene que hacer es quitarle al suelo la uniformidad de
 * plano infinito cuando se pasa cerca.
 */
export function texturaSuelo() {
  const t = lienzo(512, 512, (ctx, w, h) => {
    const azar = azarCon(4127);
    ctx.fillStyle = '#2b3a2c';
    ctx.fillRect(0, 0, w, h);

    /*
     * Repetir sin costura.
     *
     * Dibujar formas sueltas y luego poner la textura en modo repetición deja
     * una rejilla visible: lo que toca el borde se corta en seco. Cada mancha
     * se pinta nueve veces, una por cada desplazamiento de baldosa, así que lo
     * que sale por un lado entra por el otro y la junta desaparece.
     */
    const enLasNueve = (x, y, pintar) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) pintar(x + dx * w, y + dy * h);
      }
    };

    // Musgo: manchas grandes y suaves
    for (let i = 0; i < 80; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const r = w * (0.04 + azar() * 0.12);
      const verde = 44 + Math.floor(azar() * 36);
      enLasNueve(x, y, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(${verde - 12},${verde + 22},${verde - 6},.5)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }

    // Hojarasca: pequeña y apagada. Con hojas grandes y claras el suelo se
    // convertía en una alfombra de pétalos.
    for (let i = 0; i < 300; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const s = w * (0.005 + azar() * 0.012);
      const giro = azar() * Math.PI;
      const seca = azar() > 0.65;
      const color = seca
        ? `rgba(96,78,50,${0.16 + azar() * 0.2})`
        : `rgba(24,36,26,${0.2 + azar() * 0.3})`;
      enLasNueve(x, y, (px, py) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(giro);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 2.2, s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Ramitas: lo que de verdad dice «suelo de hayedo»
    for (let i = 0; i < 40; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const largo = w * (0.02 + azar() * 0.05);
      const giro = azar() * Math.PI;
      enLasNueve(x, y, (px, py) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(giro);
        ctx.strokeStyle = `rgba(70,58,40,${0.2 + azar() * 0.2})`;
        ctx.lineWidth = Math.max(1, w * 0.0035);
        ctx.beginPath();
        ctx.moveTo(-largo, 0);
        ctx.lineTo(largo, w * 0.004);
        ctx.stroke();
        ctx.restore();
      });
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  // 40 repeticiones sobre 400 m son manchas de 10 m: de cerca, una moqueta.
  // A 90 la hojarasca vuelve a tener tamaño de hoja.
  return repetible(t, 90, 90);
}

/* ────────────────────────────────────────────────────────────────────
   Hojas de primer plano
   ────────────────────────────────────────────────────────────────────

   Las que pasan a un palmo del objetivo no pueden ser la misma silueta de
   64 px que usan las motas: ahí se ve el canto, la nervadura y hasta la luz
   que las atraviesa. Se dibujan grandes (512 px), con el borde irregular y
   con sombreado interno, y de cada forma se guardan tres copias con distinto
   difuminado. La copia difuminada es la que llevan las que pasan MÁS cerca:
   así el desenfoque de profundidad sale gratis, sin tocar el sombreador ni
   pasar por un paso de posprocesado. */

/** Recorta el borde para que no quede el óvalo perfecto de un plástico. */
function bordeIrregular(ctx, s, azar, vueltas = 26) {
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < vueltas; i++) {
    const a = azar() * Math.PI * 2;
    const r = s * (0.3 + azar() * 0.2);
    ctx.beginPath();
    ctx.arc(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r * 1.15, s * (0.01 + azar() * 0.035), 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Nervadura: se resta del alfa, así se lee como un surco y no como pintura. */
function nervadura(ctx, s, ramas, ancho) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = 'rgba(0,0,0,.42)';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * ancho;
  ctx.beginPath();
  ctx.moveTo(s / 2, s * 0.06);
  ctx.lineTo(s / 2, s * 0.95);
  ctx.stroke();
  ctx.lineWidth = s * ancho * 0.5;
  for (let i = 0; i < ramas; i++) {
    const t = 0.16 + (i / ramas) * 0.7;
    const y = s * t;
    const alcance = s * 0.3 * Math.sin(t * Math.PI) * 1.5;
    ctx.beginPath();
    ctx.moveTo(s / 2, y);
    ctx.lineTo(s / 2 + alcance, y + s * 0.09);
    ctx.moveTo(s / 2, y);
    ctx.lineTo(s / 2 - alcance, y + s * 0.09);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Sombreado interno. El material multiplica el mapa por el color, así que
 * pintar grises aquí es pintar sombra: un lado en penumbra, el otro con la
 * luz pasando a través. Es lo que separa una hoja de una calcomanía.
 */
function cuerpoDeHoja(ctx, s, azar) {
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(s * 0.1, 0, s * 0.9, s);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.42, 'rgba(90,110,80,.30)');
  g.addColorStop(1, 'rgba(24,36,26,.52)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Zona translúcida: por donde el sol atraviesa el limbo
  const luz = ctx.createRadialGradient(s * 0.38, s * 0.34, 0, s * 0.38, s * 0.34, s * 0.5);
  luz.addColorStop(0, 'rgba(255,255,255,.55)');
  luz.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, s, s);
  // Manchas: ninguna hoja es de un solo tono
  for (let i = 0; i < 16; i++) {
    const r = s * (0.03 + azar() * 0.09);
    ctx.fillStyle = `rgba(${azar() > 0.5 ? '210,215,170' : '60,78,54'},${0.05 + azar() * 0.12})`;
    ctx.beginPath();
    ctx.arc(azar() * s, azar() * s, r, 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

const FORMAS = 4;

/**
 * Una hoja de primer plano.
 *
 * @param {number} forma  0 haya · 1 roble lobulado · 2 ramita compuesta · 3 fronda
 * @param {number} semilla  para que dos hojas de la misma forma no sean gemelas
 * @param {number} difuminado  píxeles de desenfoque (0 = nítida)
 */
export function texturaHojaCerca(forma = 0, semilla = 1, difuminado = 0) {
  const S = 512;
  const dibujo = document.createElement('canvas');
  dibujo.width = S;
  dibujo.height = S;
  const ctx = dibujo.getContext('2d');
  const azar = azarCon(semilla * 2357 + forma * 91 + 7);
  if (!ctx) return sinMipmaps(lienzo(4, 4, () => {}));

  ctx.fillStyle = '#ffffff';
  const c = S / 2;

  if (forma === 0) {
    // Haya: óvalo con punta y el borde ondulado
    ctx.beginPath();
    ctx.moveTo(c, S * 0.03);
    ctx.bezierCurveTo(S * 0.98, S * 0.28, S * 0.86, S * 0.80, c, S * 0.98);
    ctx.bezierCurveTo(S * 0.14, S * 0.80, S * 0.02, S * 0.28, c, S * 0.03);
    ctx.fill();
    nervadura(ctx, S, 7, 0.018);
  } else if (forma === 1) {
    // Roble: lóbulos alternos alrededor del nervio
    ctx.beginPath();
    ctx.moveTo(c, S * 0.04);
    for (let lado = 1; lado >= -1; lado -= 2) {
      const pasos = 6;
      for (let i = 0; i < pasos; i++) {
        const t = lado > 0 ? i / pasos : 1 - i / pasos;
        const y = S * (0.06 + t * 0.88);
        const w = S * (0.16 + Math.sin(t * Math.PI) * 0.3) * (0.72 + azar() * 0.5);
        ctx.quadraticCurveTo(c + lado * w * 1.25, y - S * 0.045, c + lado * w * 0.55, y);
        ctx.quadraticCurveTo(c + lado * w * 0.2, y + S * 0.035, c + lado * w * 0.62, y + S * 0.06);
      }
    }
    ctx.closePath();
    ctx.fill();
    nervadura(ctx, S, 6, 0.016);
  } else if (forma === 2) {
    // Ramita: un tallo con cinco folíolos. Rompe el «todo son hojas sueltas»
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.028;
    ctx.beginPath();
    ctx.moveTo(c * 0.94, S * 0.99);
    ctx.quadraticCurveTo(c, S * 0.5, c * 1.06, S * 0.05);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = 0.12 + i * 0.19;
      const lado = i % 2 ? 1 : -1;
      const y = S * (1 - t);
      const largo = S * (0.17 + azar() * 0.13);
      const ang = lado * (0.7 + azar() * 0.5);
      ctx.save();
      ctx.translate(c + lado * S * 0.02, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(largo * 0.55, 0, largo * 0.55, largo * 0.25, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Fronda: pinnas cada vez más cortas hacia la punta
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.022;
    ctx.beginPath();
    ctx.moveTo(c, S * 0.99);
    ctx.quadraticCurveTo(c * 1.18, S * 0.45, c * 0.86, S * 0.04);
    ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const t = i / 13;
      const y = S * (0.95 - t * 0.88);
      const x = c + Math.sin(t * 1.6) * S * 0.09;
      const largo = S * 0.26 * (1 - t * 0.78) * (0.8 + azar() * 0.45);
      for (const lado of [-1, 1]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lado * (0.95 + azar() * 0.25));
        ctx.beginPath();
        ctx.ellipse(largo * 0.5, 0, largo * 0.5, largo * 0.14, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  bordeIrregular(ctx, S, azar, forma < 2 ? 30 : 14);
  cuerpoDeHoja(ctx, S, azar);

  // El desenfoque va en un segundo lienzo: `filter` se aplica al DIBUJAR, no
  // a lo ya dibujado, así que hay que volver a pintar el resultado.
  if (difuminado > 0) {
    const salida = document.createElement('canvas');
    salida.width = S;
    salida.height = S;
    const sx = salida.getContext('2d');
    if (sx) {
      sx.filter = `blur(${difuminado}px)`;
      sx.drawImage(dibujo, 0, 0);
    }
    const t = new THREE.CanvasTexture(salida);
    t.anisotropy = 4;
    return sinMipmaps(t);
  }

  const t = new THREE.CanvasTexture(dibujo);
  t.anisotropy = 8;
  return sinMipmaps(t);
}

/** Las cuatro formas × tres grados de desenfoque, con sus variantes. */
export function juegoDeHojas() {
  const juego = [];
  for (let f = 0; f < FORMAS; f++) {
    for (let v = 0; v < 2; v++) {
      juego.push({
        forma: f,
        nitida: texturaHojaCerca(f, f * 10 + v + 1, 0),
        media: texturaHojaCerca(f, f * 10 + v + 1, 5),
        suave: texturaHojaCerca(f, f * 10 + v + 1, 13),
      });
    }
  }
  return juego;
}

/**
 * La línea de árboles del fondo.
 *
 * Es la quinta capa: lo que se ve MÁS ALLÁ del corredor. Sin ella, donde
 * acaba el arbolado instanciado empieza el cielo liso y la profundidad se
 * corta en seco. Son tres filas de copas superpuestas, cada una más pálida,
 * fundidas con el color del horizonte.
 */
export function texturaLejania() {
  const dibujo = document.createElement('canvas');
  dibujo.width = 1024;
  dibujo.height = 256;
  const ctx = dibujo.getContext('2d');
  if (!ctx) return lienzo(4, 4, () => {});
  const azar = azarCon(4211);
  const w = 1024;
  const h = 256;

  /* Copas REDONDEADAS, no triángulos.
     La primera versión dibujaba conos y se leían exactamente como lo que
     eran: cartón recortado apoyado al fondo. Un hayedo visto de lejos no
     tiene puntas, tiene una línea de bultos. Tres filas, cada una más
     pálida que la de delante, y al final un difuminado que las manda al
     aire: a 150 m no hay canto que valga. */
  const filas = [
    { base: h * 0.97, alto: h * 0.40, color: 'rgba(132,166,140,.34)', grano: 46 },
    { base: h * 1.00, alto: h * 0.58, color: 'rgba(92,126,100,.42)', grano: 62 },
    { base: h * 1.03, alto: h * 0.76, color: 'rgba(58,88,66,.5)', grano: 84 },
  ];
  for (const fila of filas) {
    ctx.fillStyle = fila.color;
    ctx.beginPath();
    ctx.moveTo(-60, h);
    let x = -60;
    while (x < w + 60) {
      const ancho = fila.grano * (0.55 + azar() * 0.95);
      const alto = fila.alto * (0.4 + azar() * 0.8);
      const cx = x + ancho / 2;
      const cima = fila.base - alto;
      // Una copa: sube redonda, se queda plana arriba y vuelve a bajar
      ctx.lineTo(x, fila.base);
      ctx.bezierCurveTo(x + ancho * 0.1, cima + alto * 0.25, cx - ancho * 0.3, cima, cx, cima);
      ctx.bezierCurveTo(cx + ancho * 0.3, cima, x + ancho * 0.9, cima + alto * 0.25, x + ancho, fila.base);
      x += ancho * (0.62 + azar() * 0.3);
    }
    ctx.lineTo(w + 60, h);
    ctx.closePath();
    ctx.fill();
  }

  // Se desvanece hacia arriba para fundirse con el cielo
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.5, 'rgba(0,0,0,.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Y se difumina entero: es la capa MÁS lejana, no puede tener filo
  const salida = document.createElement('canvas');
  salida.width = w;
  salida.height = h;
  const sx = salida.getContext('2d');
  if (sx) {
    sx.filter = 'blur(5px)';
    sx.drawImage(dibujo, 0, 0);
  }
  const t = new THREE.CanvasTexture(salida);
  t.anisotropy = 4;
  return t;
}
