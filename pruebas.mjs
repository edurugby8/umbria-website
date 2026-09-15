/**
 * Recorrido funcional de UMBRÍA.
 *
 *   python3 -m http.server 4300      (desde esta carpeta)
 *   node pruebas.mjs                 (necesita playwright)
 *
 * Sale con código 1 si algo falla.
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:4300/umbria-website/';
const fallos = [];
const ok = (n) => console.log('  ✓', n);
const fallo = (n, d) => { fallos.push(n); console.log('  ✗', n, '→', d); };

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

const cargaFuera = () => {
  const c = document.getElementById('carga');
  return !c || (c.hasAttribute('data-listo') && getComputedStyle(c).visibility === 'hidden');
};

async function abrir(opciones = {}) {
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 }, ...opciones });
  p.on('pageerror', (e) => fallo('error de página', e.message.split('\n')[0]));
  p.on('console', (m) => { if (m.type() === 'error') fallo('consola', m.text().slice(0, 120)); });
  await p.goto(URL, { waitUntil: 'networkidle' });
  // El renderizador por software tarda lo suyo en el primer fotograma: se
  // espera a que la carga se vaya, con tope, en vez de a un tiempo fijo.
  await p.waitForFunction(cargaFuera, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return p;
}

/** Salta en seco y espera a que el desplazamiento se asiente. */
async function irA(p, id) {
  await p.evaluate((i) => {
    const el = document.getElementById(i);
    scrollTo({ top: el.offsetTop - 70, behavior: 'instant' });
  }, id);
  let previo = -1;
  for (let i = 0; i < 15; i++) {
    const y = await p.evaluate(() => Math.round(scrollY));
    if (y === previo) break;
    previo = y;
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(1600);
}

console.log('\nESCRITORIO');
{
  const p = await abrir();
  try {
    // Lo que importa no es que el nodo haya desaparecido ya, sino que no tape
    // la página: se retira en dos pasos (se apaga y luego se quita del árbol).
    const carga = await p.evaluate(cargaFuera);
    carga ? ok('la pantalla de carga se retira sola') : fallo('carga', 'sigue tapando');

    const lienzo = await p.evaluate(() => !!document.querySelector('.lienzo canvas'));
    lienzo ? ok('el bosque en 3D se monta') : fallo('3D', 'sin lienzo');

    // El contenido construido desde datos.js
    const n = await p.evaluate(() => ({
      tarjetas: document.querySelectorAll('.tarjeta').length,
      piezas: document.querySelectorAll('.pieza').length,
      marquesina: document.querySelectorAll('.marquesina__voz').length,
    }));
    n.tarjetas === 3 && n.piezas === 6 && n.marquesina >= 12
      ? ok(`contenido construido (${n.tarjetas} sendas, ${n.piezas} piezas)`)
      : fallo('contenido', JSON.stringify(n));

    // Los revelados dejan el texto a la vista
    await irA(p, 'manifiesto');
    const ocultos = await p.evaluate(() =>
      [...document.querySelectorAll('.manifiesto [data-revela], .manifiesto [data-aparece]')].filter(
        (el) => parseFloat(getComputedStyle(el).opacity) < 0.9,
      ).length);
    ocultos === 0 ? ok('el manifiesto se revela entero') : fallo('revelados', `${ocultos} ocultos`);

    // Los lienzos de la galería se pintan de verdad
    await irA(p, 'galeria');
    const pintados = await p.evaluate(() =>
      [...document.querySelectorAll('.pieza__lienzo')].filter((c) => c.width > 320).length);
    pintados >= 4 ? ok(`la galería se pinta (${pintados}/6 a la vista)`) : fallo('galería', `${pintados} pintados`);

    // La linterna descubre el paisaje donde está el puntero
    await irA(p, 'linterna');
    const visor = await p.$('#visor');
    const caja = await visor.boundingBox();
    await p.mouse.move(caja.x + caja.width * 0.3, caja.y + caja.height * 0.4);
    await p.waitForTimeout(900);
    const luz = await p.evaluate(() => {
      const e = document.getElementById('visor-luz');
      return { x: e.style.getPropertyValue('--x'), r: e.style.getPropertyValue('--r') };
    });
    luz.x && luz.r ? ok(`la linterna sigue al puntero (${luz.x})`) : fallo('linterna', JSON.stringify(luz));

    // La rueda no está secuestrada: el desplazamiento suave no la roba
    const y0 = await p.evaluate(() => scrollY);
    await p.mouse.wheel(0, 700);
    let y1 = y0;
    for (let i = 0; i < 16; i++) {
      await p.waitForTimeout(220);
      const y = await p.evaluate(() => scrollY);
      if (y === y1 && y !== y0) break;
      y1 = y;
    }
    Math.abs(y1 - y0 - 700) < 160
      ? ok(`la rueda desplaza lo normal (${y1 - y0} px de 700)`)
      : fallo('rueda', `${y1 - y0} px`);

    // Control de movimiento
    await p.locator('#control-movimiento').click();
    await p.waitForTimeout(400);
    const quieto = await p.evaluate(() => document.documentElement.dataset.movimiento);
    quieto === 'quieto' ? ok('el control detiene el movimiento') : fallo('pausa', quieto);
    await p.locator('#control-movimiento').click();

    // «Volver a entrar» devuelve al principio
    await irA(p, 'final');
    await p.locator('#volver').click();
    await p.waitForTimeout(3200);
    const arriba = await p.evaluate(() => scrollY);
    arriba < 60 ? ok('«Volver a entrar» vuelve al umbral') : fallo('volver', `scrollY=${arriba}`);
  } catch (e) {
    fallo('recorrido de escritorio', e.message.split('\n')[0]);
  }
  await p.close();
}

console.log('\nMOVIMIENTO REDUCIDO');
{
  const p = await abrir({ reducedMotion: 'reduce' });
  const e = await p.evaluate(() => ({
    anima: document.documentElement.hasAttribute('data-anima'),
    movimiento: document.documentElement.dataset.movimiento,
    control: document.getElementById('control-movimiento').disabled,
    cursor: !!document.getElementById('cursor'),
    ocultos: [...document.querySelectorAll('[data-revela], [data-aparece]')].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) < 0.9,
    ).length,
  }));
  !e.anima ? ok('se retira el estado de partida de las animaciones') : fallo('anima', 'sigue puesto');
  e.movimiento === 'quieto' ? ok('el movimiento automático está detenido') : fallo('movimiento', e.movimiento);
  e.control ? ok('el control explica que no hay nada que pausar') : fallo('control', 'sigue accionable');
  !e.cursor ? ok('no se monta el cursor con halo') : fallo('cursor', 'montado');
  e.ocultos === 0 ? ok('todo el contenido es visible sin animación') : fallo('contenido', `${e.ocultos} ocultos`);
  await p.close();
}

console.log('\nMÓVIL');
{
  const p = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const desborde = await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  desborde <= 1 ? ok('sin desbordamiento horizontal') : fallo('desbordamiento', `${desborde}px`);

  await irA(p, 'galeria');
  const anchos = await p.evaluate(() =>
    [...document.querySelectorAll('.pieza')].map((e) => Math.round(e.getBoundingClientRect().width)));
  anchos.every((w) => w > 140)
    ? ok(`la galería ocupa su celda (${anchos[0]} px por pieza)`)
    : fallo('galería móvil', JSON.stringify(anchos));

  const tocable = await p.evaluate(() => getComputedStyle(document.getElementById('visor')).touchAction);
  tocable === 'pan-y' ? ok('el visor deja pasar el desplazamiento vertical') : fallo('touch-action', tocable);
  await p.close();
}

console.log('\nSIN WEBGL');
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...r) {
      return String(t).includes('webgl') ? null : orig.call(this, t, ...r);
    };
  });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3600);
  const e = await p.evaluate(() => ({
    alternativa: getComputedStyle(document.getElementById('sin-webgl')).display !== 'none',
    lienzo: !!document.querySelector('.lienzo canvas'),
    secciones: document.querySelectorAll('.escena').length,
    carga: (() => {
      const c = document.getElementById('carga');
      return !c || (c.hasAttribute('data-listo') && getComputedStyle(c).visibility === 'hidden');
    })(),
  }));
  e.alternativa ? ok('se pinta el bosque de respaldo en CSS') : fallo('alternativa', JSON.stringify(e));
  !e.lienzo ? ok('no se intenta crear el lienzo 3D') : fallo('lienzo', 'se creó igualmente');
  e.carga ? ok('la pantalla de carga se retira igual') : fallo('carga sin webgl', 'sigue puesta');
  e.secciones >= 7 ? ok(`el contenido sigue completo (${e.secciones} secciones)`) : fallo('contenido', String(e.secciones));
  await p.close();
}

await navegador.close();
console.log(fallos.length ? `\nFALLOS (${fallos.length}): ${[...new Set(fallos)].join(', ')}` : '\nTodo correcto.');
process.exit(fallos.length ? 1 : 0);
