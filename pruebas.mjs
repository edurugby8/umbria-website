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

    /* Los revelados dejan el texto a la vista.

       Se espera a la CONDICIÓN, no a un plazo. Con un plazo fijo esta
       comprobación fallaba una de cada cuatro veces bajo renderizado por
       software: los revelados los mueve GSAP con `requestAnimationFrame`, y
       si un fotograma dura casi un segundo, «esperar 1,6 s» puede ser esperar
       un solo fotograma. La prueba no era frágil por casualidad, estaba
       midiendo el tiempo equivocado. */
    await irA(p, 'manifiesto');
    const contarOcultos = () =>
      p.evaluate(() =>
        [...document.querySelectorAll('.manifiesto [data-revela], .manifiesto [data-aparece]')].filter(
          (el) => parseFloat(getComputedStyle(el).opacity) < 0.9,
        ).length);
    await p
      .waitForFunction(
        () =>
          [...document.querySelectorAll('.manifiesto [data-revela], .manifiesto [data-aparece]')].every(
            (el) => parseFloat(getComputedStyle(el).opacity) >= 0.9,
          ),
        null,
        { timeout: 45000, polling: 250 },
      )
      .catch(() => {});
    const ocultos = await contarOcultos();
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

/* ── Fase 3: las capas de profundidad ────────────────────────────── */
console.log('\nCAPAS DE PROFUNDIDAD');
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => fallo('error de página (capas)', e.message.split('\n')[0]));
  await p.addInitScript(() => { window.__debugUM = true; });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4200);

  const e = await p.evaluate(() => {
    const b = window.__bosqueUM;
    const grupo = b.hojasCerca.objeto;
    return {
      cuelgaDeLaCamara: grupo.parent === b.camara,
      hojasVivas: grupo.children.filter((c) => c.visible).length,
      // Ninguna hoja puede quedarse quieta delante del objetivo
      posiciones: grupo.children.filter((c) => c.visible).map((c) => +c.position.x.toFixed(3)),
      freno: b.hojasCerca ? 0 : 0,
    };
  });
  e.cuelgaDeLaCamara ? ok('las hojas cercanas cuelgan de la cámara') : fallo('hojas', 'no van con la cámara');
  e.hojasVivas > 0 ? ok(`hojas cercanas en el encuadre (${e.hojasVivas})`) : fallo('hojas', 'ninguna visible');

  // Otra vez: se esperan FOTOGRAMAS, no milisegundos. Con un fotograma por
  // segundo, esperar «un segundo y medio» puede no llegar a pintar ninguno y
  // las hojas parecerían quietas estando perfectamente vivas.
  await p.evaluate(() => { window.__desde = window.__bosqueUM.fotogramas; });
  await p.waitForFunction(() => window.__bosqueUM.fotogramas - window.__desde >= 8,
    null, { timeout: 60000, polling: 200 });
  const despues = await p.evaluate(() =>
    window.__bosqueUM.hojasCerca.objeto.children.filter((c) => c.visible).map((c) => +c.position.x.toFixed(3)));
  const movidas = despues.filter((x, i) => x !== e.posiciones[i]).length;
  movidas > 0 ? ok(`las hojas viajan por el encuadre (${movidas} de ${despues.length})`) : fallo('hojas', 'quietas');

  /* La pose sigue siendo función pura del desplazamiento: bajar hasta un
     punto y volver a él desde más abajo tiene que dar EXACTAMENTE la misma
     cámara. Es la propiedad que sostiene todo el recorrido.

     Se mide con el desplazamiento instantáneo (`scroll-behavior: auto`) y
     esperando a que la cámara se asiente de verdad, no a un temporizador:
     bajo renderizado por software un fotograma puede durar casi un segundo y
     cualquier plazo fijo se queda corto. */
  const pose = async (y) => {
    await p.evaluate((v) => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, v);
    }, y);
    await p.waitForFunction((v) => Math.abs(window.scrollY - v) < 2, y, { timeout: 15000 });
    // Asentada = la cámara no se mueve A LO LARGO DE VARIOS FOTOGRAMAS
    // PINTADOS. Contar milisegundos no vale: a un fotograma por segundo, dos
    // sondeos seguidos leen el mismo fotograma y parece que ya está quieta.
    await p.evaluate(() => { window.__marca = null; });
    await p.waitForFunction(() => {
      const b = window.__bosqueUM;
      const m = window.__marca;
      if (!m || Math.abs(b.st.camZ - m.camZ) > 0.01) {
        window.__marca = { camZ: b.st.camZ, fotograma: b.fotogramas };
        return false;
      }
      return b.fotogramas - m.fotograma >= 5;
    }, null, { timeout: 90000, polling: 200 });
    return p.evaluate(() => {
      const s = window.__bosqueUM.st;
      return `${Math.round(window.scrollY)}→${[s.camZ, s.camY, s.niebla].map((v) => +v.toFixed(1)).join('/')}`;
    });
  };
  const bajando = await pose(3000);
  await pose(5200);
  const subiendo = await pose(3000);
  bajando === subiendo
    ? ok(`la pose no acumula estado (${bajando} en los dos sentidos)`)
    : fallo('pose', `${bajando} ≠ ${subiendo}`);
  await p.close();
}

/* ── Fase 3: los mandos, sólo bajo petición ──────────────────────── */
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => fallo('error de página (panel)', e.message.split('\n')[0]));
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  (await p.locator('.pnl').count()) === 0
    ? ok('el panel de ajustes NO sale en la visita normal')
    : fallo('panel', 'aparece sin pedirlo');
  await p.close();

  const q = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  q.on('pageerror', (e) => fallo('error de página (panel)', e.message.split('\n')[0]));
  await q.goto(`${URL}?ajustes`, { waitUntil: 'networkidle' });
  await q.waitForTimeout(3200);
  const mandos = await q.locator('.pnl input[type=range]').count();
  mandos >= 11 ? ok(`el panel sale con ?ajustes (${mandos} mandos)`) : fallo('panel', `${mandos} mandos`);
  await q.close();
}

/* ── Realismo del primer plano ───────────────────────────────────── */
console.log('\nVEGETACIÓN CERCANA');
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => fallo('error de página (cercana)', e.message.split('\n')[0]));
  p.on('console', (m) => { if (m.type() === 'error') fallo('consola (cercana)', m.text().slice(0, 140)); });
  await p.addInitScript(() => { window.__debugUM = true; });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4500);

  const e = await p.evaluate(() => {
    const b = window.__bosqueUM;
    const piv = b.hojasCerca.objeto.children.find((c) => c.visible);
    const malla = piv?.children[0];
    return {
      material: malla?.material.type,
      // Una malla plana de cuatro vértices no puede tener volumen: no hay
      // superficie donde se vea un degradado. Ésta es LA comprobación.
      vertices: malla?.geometry.attributes.position.count ?? 0,
      uniformes: malla ? Object.keys(malla.material.uniforms) : [],
      programas: new Set(b.hojasCerca.objeto.children
        .map((c) => c.children[0]?.material.fragmentShader)).size,
    };
  });
  e.material === 'ShaderMaterial'
    ? ok('la vegetación cercana lleva sombreador propio')
    : fallo('material', String(e.material));
  e.vertices >= 15
    ? ok(`la hoja es una malla curvada (${e.vertices} vértices, antes 4)`)
    : fallo('geometría', `${e.vertices} vértices: sigue siendo un plano`);
  ['uLuzDir', 'uTransmision', 'uBorde', 'uSesgo', 'uTorsion'].every((u) => e.uniformes.includes(u))
    ? ok('recibe luz, transmisión, borde, desenfoque y torsión')
    : fallo('uniformes', e.uniformes.join(','));
  e.programas === 1
    ? ok('todas comparten un único programa de sombreador')
    : fallo('programas', `${e.programas} programas distintos`);

  // La luz de la capa cercana tiene que ser LA MISMA del bosque
  const luz = await p.evaluate(() => {
    const b = window.__bosqueUM;
    const malla = b.hojasCerca.objeto.children.find((c) => c.visible)?.children[0];
    const d = malla.material.uniforms.uLuzDir.value;
    return { largo: Math.hypot(d.x, d.y, d.z), y: d.y };
  });
  Math.abs(luz.largo - 1) < 0.01 && luz.y > 0
    ? ok(`el sol llega a la hoja como dirección en cámara (y=${luz.y.toFixed(2)})`)
    : fallo('luz', JSON.stringify(luz));

  // Variedad: ni una sola especie repetida en bucle
  const inv = await p.evaluate(() => window.__bosqueUM.hojasCerca.inventario);
  const especies = new Set(inv.map((i) => i.especie));
  especies.size >= 5
    ? ok(`variedad de formas en el encuadre (${especies.size} especies)`)
    : fallo('variedad', [...especies].join(','));
  inv.some((i) => i.asoma)
    ? ok('hay vegetación anclada a un borde, no sólo hojas sueltas')
    : fallo('ramas', 'ninguna asoma del borde');

  // Desenfoque continuo: muchos valores distintos, no tres escalones
  const sesgos = await p.evaluate(() => window.__bosqueUM.hojasCerca.objeto.children
    .filter((c) => c.visible)
    .map((c) => +c.children[0].material.uniforms.uSesgo.value.toFixed(3)));
  new Set(sesgos).size >= Math.min(6, sesgos.length)
    ? ok(`el desenfoque es continuo (${new Set(sesgos).size} valores distintos)`)
    : fallo('desenfoque', `sólo ${new Set(sesgos).size} niveles`);

  /* El centro del cuadro es donde vive el texto: nada puede plantarse ahí
     con opacidad alta. Se mira a lo largo de varios fotogramas pintados. */
  let peor = 0;
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => { window.__d = window.__bosqueUM.fotogramas; });
    await p.waitForFunction(() => window.__bosqueUM.fotogramas - window.__d >= 3,
      null, { timeout: 40000, polling: 150 });
    peor = Math.max(peor, await p.evaluate(() => {
      const b = window.__bosqueUM;
      const cam = b.camara;
      let max = 0;
      for (const piv of b.hojasCerca.objeto.children) {
        if (!piv.visible) continue;
        const malla = piv.children[0];
        if (!malla.visible) continue;
        // Posición en proporción al encuadre a la profundidad de la pieza
        const z = Math.abs(piv.position.z);
        const mh = Math.tan((cam.fov / 2) * (Math.PI / 180)) * z;
        const u = piv.position.x / (mh * cam.aspect);
        const v = piv.position.y / mh;
        if (Math.abs(u) < 0.5 && Math.abs(v) < 0.34) {
          max = Math.max(max, malla.material.uniforms.uOpacidad.value);
        }
      }
      return max;
    }));
  }
  peor < 0.45
    ? ok(`nada se planta opaco sobre el texto (máximo ${peor.toFixed(2)})`)
    : fallo('zona de respeto', `opacidad ${peor.toFixed(2)} en el centro`);
  await p.close();
}

/* ── Movimiento reducido: hay vegetación, pero quieta ─────────────── */
{
  const p = await navegador.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  p.on('pageerror', (e) => fallo('error de página (reducido)', e.message.split('\n')[0]));
  await p.addInitScript(() => { window.__debugUM = true; });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3600);
  const antes = await p.evaluate(() => window.__bosqueUM.hojasCerca.objeto.children
    .filter((c) => c.visible).map((c) => +c.position.x.toFixed(4)));
  await p.waitForTimeout(1600);
  const despues = await p.evaluate(() => window.__bosqueUM.hojasCerca.objeto.children
    .filter((c) => c.visible).map((c) => +c.position.x.toFixed(4)));
  antes.length > 0
    ? ok(`sigue habiendo vegetación compuesta (${antes.length} piezas)`)
    : fallo('reducido', 'no queda ninguna pieza');
  JSON.stringify(antes) === JSON.stringify(despues)
    ? ok('y no se mueve ni una')
    : fallo('reducido', 'las piezas siguen viajando');
  const viento = await p.evaluate(() => window.__bosqueUM.hojasCerca.objeto.children
    .filter((c) => c.visible)
    .every((c) => c.children[0].material.uniforms.uViento.value === 0));
  viento ? ok('el viento del sombreador también está parado') : fallo('reducido', 'el viento sigue');
  await p.close();
}

await navegador.close();
console.log(fallos.length ? `\nFALLOS (${fallos.length}): ${[...new Set(fallos)].join(', ')}` : '\nTodo correcto.');
process.exit(fallos.length ? 1 : 0);
