/**
 * Texturas del bosque, dibujadas en lienzo 2D al arrancar.
 *
 * Ninguna se descarga: así la página funciona sin conexión y no hay dudas de
 * licencia sobre las imágenes.
 */

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
  return sinMipmaps(lienzo(256, 256, (ctx, w, h) => {
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
    g.addColorStop(0, '#050a08');
    g.addColorStop(0.34, '#0a150f');
    g.addColorStop(0.62, '#0f2018');   // banda del horizonte
    g.addColorStop(0.78, '#0b1a14');
    g.addColorStop(1, '#060b08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
