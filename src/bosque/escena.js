/**
 * El bosque.
 *
 * Un solo lienzo 3D detrás de todo el documento. La cámara no salta entre
 * escenas: AVANZA por un corredor de árboles, y cada sección de la página es
 * una parada de ese recorrido.
 *
 * Idea central, la misma que sostiene toda la página: **la pose es una función
 * pura del desplazamiento**. No hay estado acumulado, así que bajar y volver a
 * subir recorren exactamente la misma curva y recargar a media página aterriza
 * donde debe.
 */

import * as THREE from 'three';
import { clamp, damp, lerp, salidaCubica, suave } from '../lib/util.js';
import { texturaArbol, texturaHelecho, texturaNiebla, texturaMota, texturaRayo, texturaCielo, texturaHoja } from './texturas.js';
import { crearMotas } from './particulas.js';

/* ── Paradas del recorrido ──────────────────────────────────────────── */

const base = {
  camX: 0, camY: 2.4, camZ: 18,
  mirarY: 2.2,
  giro: 0,
  niebla: 0.030,
  rayos: 0.6,
  polen: 0.8,
  luciernagas: 0.1,
  velo: 0,       // jirones de niebla cruzando delante de la cámara
  luz: 1,        // exposición: es lo que hace que el claro se note como claro
};
const pose = (p) => ({ ...base, ...p });

export const PARADAS = {
  umbral:     pose({ camZ: 18,  camY: 2.3, mirarY: 2.4, niebla: 0.034, rayos: 0.55, velo: 1, luz: 1 }),
  intro:      pose({ camZ: 6,   camY: 2.6, mirarY: 2.6, niebla: 0.028, rayos: 0.85, velo: .5, luz: 1.08 }),
  sendas:     pose({ camZ: -8,  camY: 3.1, mirarY: 2.4, giro: 0.12, niebla: 0.026, rayos: 0.7, velo: .35, luz: 1.02 }),
  linterna:   pose({ camZ: -22, camY: 1.7, mirarY: 1.9, giro: -0.08, niebla: 0.052, rayos: 0.1, polen: 0.35, luciernagas: 1, velo: .8, luz: 0.72 }),
  galeria:    pose({ camZ: -36, camY: 3.4, mirarY: 2.7, giro: 0.06, niebla: 0.030, rayos: 0.75, polen: 1, luciernagas: 0.3, velo: .3, luz: 1 }),
  manifiesto: pose({ camZ: -50, camY: 2.3, mirarY: 2.3, giro: -0.05, niebla: 0.038, rayos: 0.45, velo: .55, luz: 0.92 }),
  // El claro: menos niebla, más luz y la exposición arriba. Llegar aquí tiene
  // que notarse en la piel, no sólo en el texto.
  final:      pose({ camZ: -68, camY: 3.6, mirarY: 3.1, niebla: 0.015, rayos: 1.3, polen: 1, luciernagas: 0.2, velo: .18, luz: 1.5 }),
};

const CLAVES = Object.keys(base);

/** De dónde sale la cámara en la entrada: más atrás, más baja y con más niebla. */
const ARRANQUE = pose({ camZ: 36, camY: 1.5, mirarY: 3.2, niebla: 0.075, rayos: 0.15, polen: 0.2, luciernagas: 0, velo: 1, luz: 0.55 });

const ENTRADA = { retardo: 0.15, duracion: 2.6 };

/* ── Montaje ────────────────────────────────────────────────────────── */

export function montarBosque({ contenedor, caps, reducido, alPintar }) {
  const renderer = new THREE.WebGLRenderer({ antialias: caps.antialias, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, caps.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const cielo = texturaCielo();
  escena.background = cielo;
  const niebla = new THREE.FogExp2(0x0f2018, base.niebla);
  escena.fog = niebla;

  const camara = new THREE.PerspectiveCamera(52, 1, 0.1, 400);

  // ── Luz ────────────────────────────────────────────────────────────
  // Materiales básicos: la profundidad la da la niebla, no el sombreado.
  // Sale más barato y, en un bosque a contraluz, más creíble.
  const mapas = {
    arboles: [texturaArbol(1), texturaArbol(7), texturaArbol(13)],
    helechos: [texturaHelecho(3), texturaHelecho(11)],
    niebla: texturaNiebla(5),
    mota: texturaMota(),
    rayo: texturaRayo(),
    hoja: texturaHoja(),
    cielo,
  };
  const aDesechar = [];

  /* ── Suelo ───────────────────────────────────────────────────────── */
  const geoSuelo = new THREE.PlaneGeometry(400, 400);
  const matSuelo = new THREE.MeshBasicMaterial({ color: 0x0a150f, fog: true });
  const suelo = new THREE.Mesh(geoSuelo, matSuelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.4;
  escena.add(suelo);
  aDesechar.push(geoSuelo, matSuelo);

  /* ── Arbolado ────────────────────────────────────────────────────
     Cada árbol son DOS planos cruzados en aspa. Con un solo plano, al pasar
     la cámara por su lado el árbol desaparecería de canto. */
  function geometriaAspa(ancho, alto) {
    const a = new THREE.PlaneGeometry(ancho, alto);
    a.translate(0, alto / 2, 0);
    const b = a.clone();
    b.rotateY(Math.PI / 2);
    const fusion = mezclarGeometrias([a, b]);
    a.dispose();
    b.dispose();
    return fusion;
  }

  /** Fusión mínima de geometrías no indexadas con los mismos atributos. */
  function mezclarGeometrias(lista) {
    const salida = new THREE.BufferGeometry();
    const nombres = ['position', 'normal', 'uv'];
    for (const nombre of nombres) {
      const partes = lista.map((g) => {
        const a = g.index ? g.toNonIndexed().getAttribute(nombre) : g.getAttribute(nombre);
        return a;
      });
      const total = partes.reduce((s, a) => s + a.count, 0);
      const tam = partes[0].itemSize;
      const datos = new Float32Array(total * tam);
      let off = 0;
      for (const a of partes) {
        datos.set(a.array.subarray(0, a.count * tam), off);
        off += a.count * tam;
      }
      salida.setAttribute(nombre, new THREE.BufferAttribute(datos, tam));
    }
    return salida;
  }

  const dummy = new THREE.Object3D();
  const arboledas = [];
  /** Uniformes del viento, compartidos por toda la vegetación. */
  const viento = { value: 0 };

  /**
   * Viento.
   *
   * Un bosque quieto no es un bosque. El balanceo se inyecta en el sombreador
   * de vértices del material ya existente (`onBeforeCompile`) en vez de mover
   * matrices desde la CPU: así noventa árboles cuestan lo mismo que uno, y el
   * movimiento es continuo en lugar de ir a saltos por fotograma.
   *
   * Sólo se mueve la parte alta: la fuerza va con el cuadrado de la altura de
   * la copa, de modo que el pie del tronco se queda clavado en el suelo.
   */
  function conViento(material, fuerza) {
    const uFuerza = { value: fuerza };
    material.userData.viento = { viento, uFuerza };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uViento = viento;
      shader.uniforms.uFuerza = uFuerza;
      shader.vertexShader =
        'uniform float uViento;\nuniform float uFuerza;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float copa = uv.y * uv.y;
          vec4 enMundo = instanceMatrix * vec4(transformed, 1.0);
          float fase = enMundo.x * 0.23 + enMundo.z * 0.19;
          transformed.x += sin(uViento * 1.15 + fase) * copa * uFuerza;
          transformed.z += cos(uViento * 0.81 + fase * 1.4) * copa * uFuerza * 0.55;
        }`,
      );
    };
    material.needsUpdate = true;
    return material;
  }

  mapas.arboles.forEach((mapa, i) => {
    const cuantos = Math.round(caps.arboles / mapas.arboles.length);
    const geo = geometriaAspa(9, 22);
    const mat = new THREE.MeshBasicMaterial({
      map: mapa,
      color: 0x0d1f17,
      transparent: false,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      fog: true,
    });
    conViento(mat, 0.55);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    for (let n = 0; n < cuantos; n++) {
      // Se reparten en un corredor: nunca en el centro, para dejar la senda
      const lado = Math.random() > 0.5 ? 1 : -1;
      const x = lado * (4 + Math.pow(Math.random(), 0.65) * 26);
      const z = 28 - Math.random() * 130;
      const s = 0.55 + Math.random() * 1.1 + Math.abs(x) * 0.015;
      dummy.position.set(x, -0.4, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(s, s * (0.85 + Math.random() * 0.4), s);
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
    malla.frustumCulled = false;
    escena.add(malla);
    arboledas.push(malla);
    aDesechar.push(geo, mat);
    if (i === 0) malla.renderOrder = 1;
  });

  /* ── Sotobosque ──────────────────────────────────────────────────── */
  mapas.helechos.forEach((mapa) => {
    const cuantos = Math.round(caps.helechos / mapas.helechos.length);
    const geo = geometriaAspa(3.2, 2.2);
    const mat = new THREE.MeshBasicMaterial({
      map: mapa,
      color: 0x11291d,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      fog: true,
    });
    conViento(mat, 0.14);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    for (let n = 0; n < cuantos; n++) {
      const lado = Math.random() > 0.5 ? 1 : -1;
      const x = lado * (3.4 + Math.pow(Math.random(), 0.7) * 18);
      const z = 22 - Math.random() * 124;
      const s = 0.5 + Math.random() * 0.7;
      dummy.position.set(x, -0.45, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
    malla.frustumCulled = false;
    escena.add(malla);
    aDesechar.push(geo, mat);
  });

  /* ── Rayos de luz ────────────────────────────────────────────────── */
  const rayos = [];
  {
    const geo = new THREE.PlaneGeometry(9, 42);
    geo.translate(0, -21, 0);
    aDesechar.push(geo);
    for (let i = 0; i < caps.rayos; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: mapas.rayo,
        color: 0xffe9bd,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 34, 24, 14 - i * 22 - Math.random() * 10);
      m.rotation.z = (Math.random() - 0.5) * 0.5;
      m.rotation.y = (Math.random() - 0.5) * 0.6;
      m.renderOrder = 4;
      escena.add(m);
      rayos.push({ malla: m, fase: Math.random() * 6.28, fuerza: 0.35 + Math.random() * 0.5 });
      aDesechar.push(mat);
    }
  }

  /* ── Jirones de niebla ───────────────────────────────────────────── */
  const velos = [];
  {
    const geo = new THREE.PlaneGeometry(56, 22);
    aDesechar.push(geo);
    for (let i = 0; i < caps.nieblas; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: mapas.niebla,
        color: 0xcfe3d4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      const m = new THREE.Mesh(geo, mat);
      const z = 22 - i * 13 - Math.random() * 6;
      m.position.set(0, 1.5 + Math.random() * 4, z);
      m.renderOrder = 3;
      escena.add(m);
      velos.push({
        malla: m,
        // Los dos primeros son los que se abren en la entrada
        portal: i < 2 ? (i === 0 ? -1 : 1) : 0,
        fase: Math.random() * 6.28,
        vel: 0.05 + Math.random() * 0.12,
        base: 0.12 + Math.random() * 0.14,
      });
      aDesechar.push(mat);
    }
  }

  /* ── Polen y luciérnagas ─────────────────────────────────────────── */
  const polen = crearMotas({
    cuantas: caps.polen,
    mapa: mapas.mota,
    caja: [70, 30, 150],
    color: 0xf3ead2,
    tamano: 1.1,
    velocidad: [0.18, 0.75],
    deriva: 1.4,
    opacidad: 0.55,
  });
  escena.add(polen.objeto);

  const luciernagas = crearMotas({
    cuantas: caps.luciernagas,
    mapa: mapas.mota,
    caja: [46, 12, 90],
    color: 0xc8f08a,
    tamano: 3.4,
    velocidad: [0.04, 0.22],
    deriva: 2.6,
    parpadeo: 1,
    opacidad: 0,
  });
  luciernagas.objeto.position.y = 0.5;
  escena.add(luciernagas.objeto);

  // Hojas: caen, voltean y no brillan. Mezcla normal, no aditiva: una hoja no
  // emite luz, y en aditivo se leían como chispas.
  const hojas = crearMotas({
    cuantas: Math.round(caps.polen * 0.09) + 14,
    mapa: mapas.hoja,
    caja: [56, 26, 110],
    color: 0xc7a878,
    tamano: 16,
    velocidad: [0.35, 1.1],
    deriva: 2.2,
    opacidad: 0,
    gira: 1,
    cae: true,
    mezcla: THREE.NormalBlending,
  });
  escena.add(hojas.objeto);

  /* ── Estado y bucle ──────────────────────────────────────────────── */

  const st = { ...base, entrada: reducido ? 1 : 0, punteroX: 0, punteroY: 0, suaveX: 0, suaveY: 0 };
  const objetivo = { ...base };
  let tramos = [];
  let inicioEntrada = 0;
  let reloj = 0;
  let movimiento = reducido ? 0 : 1;
  let visible = 1;
  let corriendo = true;
  let raf = 0;
  let anterior = performance.now();
  let primerFotograma = true;
  const mira = new THREE.Vector3();

  /** Mide dónde empieza y acaba cada parada dentro del documento. */
  function medir() {
    const alto = window.innerHeight;
    const nodos = [...document.querySelectorAll('[data-tiempo]')];
    tramos = nodos
      .map((el) => {
        const caja = el.getBoundingClientRect();
        const arriba = caja.top + window.scrollY;
        return {
          nombre: el.dataset.tiempo,
          pose: PARADAS[el.dataset.tiempo],
          // La parada «manda» cuando su bloque cruza el centro de la pantalla
          centro: arriba + caja.height / 2 - alto / 2,
        };
      })
      .filter((t) => t.pose)
      .sort((a, b) => a.centro - b.centro);
  }

  /** Pose en un desplazamiento dado. Función pura: sin estado acumulado. */
  function poseEn(y, salida) {
    if (!tramos.length) return Object.assign(salida, base);
    if (y <= tramos[0].centro) return Object.assign(salida, tramos[0].pose);
    const ultimo = tramos[tramos.length - 1];
    if (y >= ultimo.centro) return Object.assign(salida, ultimo.pose);

    for (let i = 0; i < tramos.length - 1; i++) {
      const a = tramos[i];
      const b = tramos[i + 1];
      if (y >= a.centro && y <= b.centro) {
        const t = suave(0, 1, (y - a.centro) / Math.max(1, b.centro - a.centro));
        for (const k of CLAVES) salida[k] = lerp(a.pose[k], b.pose[k], t);
        return salida;
      }
    }
    return salida;
  }

  function redimensionar() {
    const w = contenedor.clientWidth || window.innerWidth;
    const h = contenedor.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, caps.dpr));
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // En vertical se abre el ángulo: si no, el bosque se convierte en un túnel
    camara.fov = camara.aspect < 1 ? 66 : 52;
    camara.updateProjectionMatrix();
    medir();
  }
  redimensionar();
  window.addEventListener('resize', redimensionar);

  const curvaEntrada = (t) => {
    const x = clamp((t - ENTRADA.retardo) / ENTRADA.duracion);
    return salidaCubica(x);
  };

  function fotograma() {
    raf = requestAnimationFrame(fotograma);
    if (!corriendo) return;

    /*
     * Un solo reloj y el delta acotado por los DOS lados. Con un delta
     * negativo —que sale de mezclar el sello de requestAnimationFrame con
     * performance.now() en equipos lentos— la interpolación exponencial se
     * convierte en una exponencial creciente y la escena se va a tomar viento.
     */
    const ahora = performance.now();
    const dt = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.25);
    anterior = ahora;

    reloj += dt * movimiento * visible;
    viento.value = reloj;

    poseEn(window.scrollY, objetivo);

    // La entrada se mezcla POR ENCIMA del scroll: lo tiñe, no compite con él
    if (inicioEntrada > 0) {
      st.entrada = curvaEntrada((ahora - inicioEntrada) / 1000);
      if (st.entrada >= 1) inicioEntrada = 0;
    }
    if (st.entrada < 1) {
      for (const k of CLAVES) objetivo[k] = lerp(ARRANQUE[k], objetivo[k], st.entrada);
    }

    const lambda = reducido ? 40 : 4.6;
    for (const k of CLAVES) st[k] = damp(st[k], objetivo[k], lambda, dt);
    st.suaveX = damp(st.suaveX, st.punteroX, 2.8, dt);
    st.suaveY = damp(st.suaveY, st.punteroY, 2.8, dt);

    // ── Cámara: la parada manda, el puntero sólo ladea ────────────────
    const paralajeX = st.suaveX * 2.7 * movimiento;
    const paralajeY = -st.suaveY * 1.3 * movimiento;
    const respira = Math.sin(reloj * 0.42) * 0.16 * movimiento;
    // Un balanceo mínimo, como el de alguien que camina mirando alrededor
    camara.rotation.z = 0;
    camara.position.set(st.camX + paralajeX, st.camY + paralajeY + respira, st.camZ);
    mira.set(
      st.giro * 14 + paralajeX * 0.35,
      st.mirarY + paralajeY * 0.4,
      st.camZ - 24,
    );
    camara.lookAt(mira);
    camara.rotateZ(Math.sin(reloj * 0.23) * 0.012 * movimiento - st.suaveX * 0.02 * movimiento);

    niebla.density = st.niebla;
    // En vertical entra mucha menos escena y el bosque se quedaba a oscuras
    // detrás del texto: se abre un poco el diafragma.
    renderer.toneMappingExposure = 1.05 * st.luz * (camara.aspect < 1 ? 1.28 : 1);

    // ── Rayos ─────────────────────────────────────────────────────────
    for (const r of rayos) {
      const vaiven = 0.75 + 0.25 * Math.sin(reloj * 0.3 + r.fase);
      r.malla.material.opacity = st.rayos * r.fuerza * vaiven * 0.5;
      r.malla.visible = r.malla.material.opacity > 0.008;
      if (r.malla.visible) r.malla.rotation.z += Math.sin(reloj * 0.12 + r.fase) * 0.00025 * movimiento;
    }

    // ── Jirones: los dos primeros se apartan al entrar ────────────────
    for (const v of velos) {
      const deriva = Math.sin(reloj * v.vel + v.fase) * 6;
      const apertura = v.portal ? v.portal * (3 + st.entrada * 26) : 0;
      v.malla.position.x = deriva + apertura;
      v.malla.material.opacity = st.velo * v.base * (v.portal ? 1 - st.entrada * 0.55 : 1);
      v.malla.visible = v.malla.material.opacity > 0.006;
    }

    // ── Motas ─────────────────────────────────────────────────────────
    polen.avanzar(reloj);
    luciernagas.avanzar(reloj);
    hojas.avanzar(reloj);
    polen.opacidad = st.polen * 0.55;
    luciernagas.opacidad = st.luciernagas * 0.95;
    hojas.opacidad = st.polen * 0.62;
    polen.objeto.position.z = st.camZ - 40;
    luciernagas.objeto.position.z = st.camZ - 22;
    hojas.objeto.position.z = st.camZ - 34;

    renderer.render(escena, camara);

    // La pantalla de carga se retira cuando el bosque ya está pintado, no
    // cuando lo dice un temporizador: dura lo que tiene que durar.
    if (primerFotograma) {
      primerFotograma = false;
      alPintar?.();
    }
  }
  raf = requestAnimationFrame(fotograma);

  const alVisibilidad = () => {
    corriendo = !document.hidden;
    visible = corriendo ? 1 : 0;
    anterior = performance.now();
  };
  document.addEventListener('visibilitychange', alVisibilidad);

  // Sonda de diagnóstico: permite apagar capas para ver quién pinta qué.
  if (window.__debugUM) {
    window.__bosqueUM = { escena, camara, arboledas, rayos, velos, polen, luciernagas, hojas, st };
  }

  return {
    /** Arranca la entrada cinematográfica. */
    entrar() {
      if (reducido) {
        st.entrada = 1;
        return;
      }
      inicioEntrada = performance.now();
      st.entrada = 0;
    },
    puntero(x, y) {
      st.punteroX = x;
      st.punteroY = y;
    },
    set movimiento(v) {
      movimiento = v ? 1 : 0;
    },
    medir,
    get estado() {
      return st;
    },
    destruir() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', redimensionar);
      document.removeEventListener('visibilitychange', alVisibilidad);
      polen.liberar();
      luciernagas.liberar();
      hojas.liberar();
      aDesechar.forEach((o) => o.dispose?.());
      Object.values(mapas).flat().forEach((t) => t.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
