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
   Vegetación de primer plano
   ────────────────────────────────────────────────────────────────────

   Las piezas que pasan a un palmo del objetivo son las que el visitante mira
   con más detalle, así que son las que más variedad necesitan. Aquí hay NUEVE
   especies y formas distintas —haya, roble, acebo, avellano, castaño, un
   grupo de tres, una ramita, una fronda de helecho y un fragmento de rama—,
   cada una con dos semillas, y ninguna es otra rotada.

   Dos decisiones que importan:

   · CON MIPMAPS, al revés que el resto de recortes del bosque. Estas van con
     mezcla alfa, no con `alphaTest`, así que no sufren el artefacto del
     cuadrado pálido; y teniendo mipmaps el sombreador puede pedir el nivel
     que quiera con un sesgo y conseguir un desenfoque CONTINUO. Antes había
     tres copias prehorneadas de cada forma: se veía el salto entre niveles y
     además ocupaba el triple de memoria.

   · EL SOMBREADO YA NO SE PINTA. Antes la textura llevaba su luz y su sombra
     dibujadas, siempre iguales, mirase donde mirase el sol. Ahora sólo lleva
     la FORMA, la nervadura y las imperfecciones; la luz la pone el material
     con la del bosque. */

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

/**
 * Imperfecciones: un agujero de bicho, un mordisco en el canto, una mancha
 * seca. Ninguna hoja de un bosque de verdad está entera, y es de esas cosas
 * que no se notan hasta que faltan: sin ellas todas parecen recién estampadas.
 */
function imperfecciones(ctx, s, azar, cuantas = 2) {
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < cuantas; i++) {
    if (azar() < 0.35) continue;
    const x = s * (0.22 + azar() * 0.56);
    const y = s * (0.2 + azar() * 0.6);
    const r = s * (0.012 + azar() * 0.04);
    ctx.beginPath();
    // Un agujero de bicho no es un círculo: es un borde roído
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * 6.283;
      const rr = r * (0.6 + azar() * 0.8);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Mordisco en el canto
  if (azar() < 0.45) {
    const lado = azar() > 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(s / 2 + lado * s * (0.22 + azar() * 0.16), s * (0.25 + azar() * 0.5),
      s * (0.05 + azar() * 0.06), 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Nervadura: se resta del alfa, así se lee como un surco y no como pintura. */
function nervadura(ctx, s, ramas, ancho, curva = 0.09) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
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
    ctx.lineTo(s / 2 + alcance, y + s * curva);
    ctx.moveTo(s / 2, y);
    // Los dos lados NO salen a la misma altura: así es una hoja de verdad
    ctx.moveTo(s / 2, y + s * 0.02);
    ctx.lineTo(s / 2 - alcance * 0.92, y + s * curva * 1.15);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Relieve muy suave dentro del limbo.
 *
 * Ojo: esto NO es sombreado direccional —de eso se encarga el material con la
 * luz del bosque—. Es sólo la variación de tono que tiene una hoja por sí
 * misma: el limbo algo más claro que los nervios, alguna mancha seca. Pintar
 * aquí una luz fija es lo que hacía que la hoja se viese igual mirase donde
 * mirase el sol.
 */
function tejido(ctx, s, azar) {
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 18; i++) {
    const r = s * (0.03 + azar() * 0.1);
    const claro = azar() > 0.45;
    ctx.fillStyle = claro
      ? `rgba(226,232,206,${0.05 + azar() * 0.1})`
      : `rgba(74,84,60,${0.05 + azar() * 0.13})`;
    ctx.beginPath();
    ctx.ellipse(azar() * s, azar() * s, r, r * (0.5 + azar() * 0.8), azar() * 3, 0, 6.283);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Media hoja, dibujada lado a lado con controles distintos: nada simétrico. */
function medioLimbo(ctx, s, lado, ancho, hombro, punta, azar) {
  const c = s / 2;
  ctx.moveTo(c, s * punta);
  ctx.bezierCurveTo(
    c + lado * s * ancho * (0.95 + azar() * 0.2), s * hombro,
    c + lado * s * ancho * (0.82 + azar() * 0.25), s * (0.72 + azar() * 0.1),
    c + lado * s * 0.02, s * 0.97,
  );
}

/** Tallo: se estrecha hacia la punta y nunca va recto. */
function tallo(ctx, s, largo, grueso, curva, azar) {
  const c = s / 2;
  const pasos = 14;
  ctx.beginPath();
  for (let lado = 1; lado >= -1; lado -= 2) {
    for (let i = 0; i <= pasos; i++) {
      const t = lado > 0 ? i / pasos : 1 - i / pasos;
      const y = s * (0.99 - t * largo);
      const x = c + Math.sin(t * 2.1) * s * curva + lado * s * grueso * (1 - t * 0.85);
      i === 0 && lado > 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  // Devuelve por dónde va el tallo, para colgar de ahí las hojas
  return (t) => ({
    x: c + Math.sin(t * 2.1) * s * curva,
    y: s * (0.99 - t * largo),
  });
}

/** Un folíolo suelto, para colgarlo de un tallo. */
function foliolo(ctx, x, y, largo, ancho, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(largo * 0.35, -ancho, largo, -ancho * 0.12);
  ctx.quadraticCurveTo(largo * 0.35, ancho * 0.85, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** Las nueve formas. El nombre es el que usa el resto del sistema. */
export const ESPECIES = ['haya', 'roble', 'acebo', 'avellano', 'castano', 'grupo', 'ramita', 'fronda', 'rama'];

/** A qué perfil de geometría curvada corresponde cada forma. */
export const PERFIL_DE = {
  haya: 'hoja', roble: 'hoja', acebo: 'hoja', avellano: 'hoja', castano: 'hoja',
  grupo: 'grupo', ramita: 'ramita', fronda: 'fronda', rama: 'rama',
};

/**
 * Dibuja una pieza de vegetación cercana.
 *
 * Sólo la FORMA: silueta, nervadura, imperfecciones y el tejido propio. La
 * luz no se pinta aquí; la pone el material con la del bosque.
 */
export function texturaVegetacion(especie = 'haya', semilla = 1, lado = 512) {
  const S = lado;
  const c = S / 2;
  const azar = azarCon(semilla * 2357 + especie.length * 911 + 13);

  const t = lienzo(S, S, (ctx) => {
    ctx.fillStyle = '#ffffff';

    if (especie === 'haya') {
      // Óvalo con punta y el canto ondulado. Los dos lados, distintos.
      ctx.beginPath();
      medioLimbo(ctx, S, 1, 0.42, S * 0.0005 + 0.3, 0.03, azar);
      medioLimbo(ctx, S, -1, 0.39, 0.27, 0.03, azar);
      ctx.fill();
      nervadura(ctx, S, 7, 0.016);
    } else if (especie === 'roble') {
      // Lóbulos alternos, ninguno igual al de enfrente
      ctx.beginPath();
      ctx.moveTo(c, S * 0.04);
      for (const lado2 of [1, -1]) {
        const pasos = 6;
        for (let i = 0; i < pasos; i++) {
          const tt = lado2 > 0 ? i / pasos : 1 - i / pasos;
          const y = S * (0.06 + tt * 0.88);
          const w = S * (0.14 + Math.sin(tt * Math.PI) * 0.29) * (0.68 + azar() * 0.6);
          ctx.quadraticCurveTo(c + lado2 * w * 1.3, y - S * 0.05, c + lado2 * w * 0.5, y);
          ctx.quadraticCurveTo(c + lado2 * w * 0.16, y + S * 0.04, c + lado2 * w * 0.6, y + S * 0.062);
        }
      }
      ctx.closePath();
      ctx.fill();
      nervadura(ctx, S, 6, 0.015, 0.11);
    } else if (especie === 'acebo') {
      /* Acebo: el canto va en pinchos. Lo nombra el propio texto de la página
         —«primero el haya, luego el acebo»—, así que tenía que estar. */
      ctx.beginPath();
      ctx.moveTo(c, S * 0.04);
      for (const lado2 of [1, -1]) {
        const pinchos = 5;
        for (let i = 0; i < pinchos; i++) {
          const tt = lado2 > 0 ? i / pinchos : 1 - i / pinchos;
          const y = S * (0.08 + tt * 0.84);
          const w = S * (0.13 + Math.sin(tt * Math.PI) * 0.22) * (0.8 + azar() * 0.4);
          ctx.lineTo(c + lado2 * w, y);
          ctx.lineTo(c + lado2 * w * 1.45, y + S * (0.03 + azar() * 0.03));
          ctx.lineTo(c + lado2 * w * 0.72, y + S * 0.075);
        }
      }
      ctx.closePath();
      ctx.fill();
      nervadura(ctx, S, 5, 0.018, 0.07);
    } else if (especie === 'avellano') {
      // Redonda, con la base asimétrica y la punta corta
      ctx.beginPath();
      ctx.moveTo(c, S * 0.07);
      ctx.bezierCurveTo(S * 0.99, S * 0.22, S * 0.93, S * 0.76, c + S * 0.04, S * 0.96);
      ctx.bezierCurveTo(S * 0.1, S * 0.82, S * 0.02, S * 0.26, c, S * 0.07);
      ctx.fill();
      nervadura(ctx, S, 8, 0.013, 0.12);
      // Doble sierra en el canto
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 40; i++) {
        const a = azar() * 6.283;
        const r = S * 0.44;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r * 1.02, S * (0.012 + azar() * 0.02), 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (especie === 'castano') {
      // Lanceolada, larga y con el canto en dientes finos
      ctx.beginPath();
      ctx.moveTo(c, S * 0.01);
      ctx.bezierCurveTo(S * 0.78, S * 0.3, S * 0.74, S * 0.75, c + S * 0.01, S * 0.99);
      ctx.bezierCurveTo(S * 0.28, S * 0.74, S * 0.24, S * 0.28, c, S * 0.01);
      ctx.fill();
      nervadura(ctx, S, 11, 0.011, 0.055);
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 34; i++) {
        const tt = i / 34;
        const y = S * (0.06 + tt * 0.88);
        const w = S * 0.24 * Math.sin(tt * Math.PI) + S * 0.02;
        const l2 = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.arc(c + l2 * w, y, S * 0.017, 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (especie === 'grupo') {
      /* Tres hojas del mismo pecíolo. Esto es lo que impedía que la capa
         pareciese parte de un árbol: hojas sueltas flotando, nunca un
         conjunto que se mueva a la vez. */
      const eje = tallo(ctx, S, 0.3, 0.012, 0.02, azar);
      const base = eje(0.28);
      const cuantas = azar() > 0.45 ? 3 : 2;
      for (let i = 0; i < cuantas; i++) {
        const ang = -Math.PI / 2 + (i - (cuantas - 1) / 2) * (0.55 + azar() * 0.25);
        const largo = S * (0.42 + azar() * 0.16);
        ctx.save();
        ctx.translate(base.x, base.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(largo * 0.3, -largo * 0.3, largo * 0.85, -largo * 0.16, largo, 0);
        ctx.bezierCurveTo(largo * 0.85, largo * 0.2, largo * 0.3, largo * 0.26, 0, 0);
        ctx.fill();
        // Nervio del folíolo
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,.4)';
        ctx.lineWidth = S * 0.008;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(largo * 0.94, 0);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
    } else if (especie === 'ramita') {
      // Tallo largo con folíolos alternos y alguno ya caído
      /* Folíolos anchos y numerosos. Con siete estrechos y alternos el
         dibujo salía en espina de pez —parecía una pluma, no una ramita— y a
         contraluz se volvía inconfundiblemente un hueso. Una ramita de haya
         lleva hoja de sobra: lo que se ve es el follaje, no el tallo. */
      const eje = tallo(ctx, S, 0.94, 0.012, 0.05, azar);
      for (let i = 0; i < 11; i++) {
        if (azar() < 0.1) continue; // a una ramita siempre le falta alguna
        const tt = 0.1 + i * 0.083;
        const pt = eje(tt);
        const l2 = i % 2 ? 1 : -1;
        const largo = S * (0.24 + azar() * 0.13) * (1 - tt * 0.3);
        foliolo(ctx, pt.x, pt.y, largo * l2, S * (0.09 + azar() * 0.05), l2 * (0.5 + azar() * 0.4));
      }
    } else if (especie === 'fronda') {
      // Fronda de helecho: pinnas cada vez más cortas hacia la punta
      /* Pinnas cortas y numerosas. Con pocas y largas el resultado se leía
         como una hoja de palmera, que es cualquier cosa menos una umbría. */
      const eje = tallo(ctx, S, 0.95, 0.011, 0.07, azar);
      for (let i = 0; i < 22; i++) {
        const tt = 0.04 + (i / 22) * 0.93;
        const pt = eje(tt);
        const largo = S * 0.17 * (1 - tt * 0.78) * (0.8 + azar() * 0.4);
        for (const l2 of [-1, 1]) {
          foliolo(ctx, pt.x, pt.y, largo * l2, S * 0.042 * (1 - tt * 0.45), l2 * (1.0 + azar() * 0.25));
        }
      }
    } else {
      /* Rama: un fragmento con dos ramificaciones y hojas prendidas. Entra
         por un lateral y casi siempre se queda a medias fuera del encuadre,
         que es lo que hace pensar que hay un árbol ahí al lado. */
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      const dibujarRama = (x0, y0, x1, y1, grueso, hojas) => {
        ctx.lineWidth = grueso;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + S * 0.07, (y0 + y1) / 2 - S * 0.05, x1, y1);
        ctx.stroke();
        for (let i = 0; i < hojas; i++) {
          const tt = 0.2 + azar() * 0.75;
          const x = x0 + (x1 - x0) * tt;
          const y = y0 + (y1 - y0) * tt;
          foliolo(ctx, x, y, S * (0.11 + azar() * 0.09) * (azar() > 0.5 ? 1 : -1),
            S * (0.035 + azar() * 0.03), (azar() - 0.5) * 2.4);
        }
      };
      dibujarRama(S * 0.02, S * 0.86, S * 0.94, S * 0.3, S * 0.035, 6);
      dibujarRama(S * 0.4, S * 0.66, S * 0.72, S * 0.08, S * 0.02, 4);
      dibujarRama(S * 0.6, S * 0.53, S * 0.98, S * 0.72, S * 0.016, 3);
    }

    bordeIrregular(ctx, S, azar, especie === 'grupo' || ESPECIES.indexOf(especie) < 5 ? 30 : 12);
    if (ESPECIES.indexOf(especie) < 6) imperfecciones(ctx, S, azar, 3);
    tejido(ctx, S, azar);
  });

  /* Mipmaps, al contrario que en el resto de recortes del bosque: son de
     mezcla alfa, no de `alphaTest`, así que no sufren el artefacto del
     cuadrado pálido, y gracias a ellos el sombreador puede pedir un nivel
     más borroso y conseguir el desenfoque por distancia sin copias extra. */
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/**
 * La biblioteca completa de vegetación cercana.
 *
 * Nueve formas por dos semillas: dieciocho piezas distintas. Con los tres
 * niveles de desenfoque que había antes y cuatro formas eran veinticuatro
 * lienzos para doce siluetas; ahora son dieciocho lienzos para dieciocho
 * siluetas y el desenfoque sale del mipmap.
 *
 * @param {'alto'|'medio'|'bajo'} nivel
 */
export function bibliotecaVegetacion(nivel = 'medio') {
  const lado = nivel === 'alto' ? 512 : nivel === 'medio' ? 384 : 256;
  const semillas = nivel === 'bajo' ? 1 : 2;
  const biblioteca = [];
  for (const especie of ESPECIES) {
    for (let s = 0; s < semillas; s++) {
      biblioteca.push({
        especie,
        perfil: PERFIL_DE[especie],
        mapa: texturaVegetacion(especie, s * 37 + ESPECIES.indexOf(especie) + 1, lado),
      });
    }
  }
  return biblioteca;
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
