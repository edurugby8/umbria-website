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
import { clamp, damp, lerp, ruido, salidaCubica, suave } from '../lib/util.js';
import {
  texturaHelecho,
  texturaNiebla,
  texturaMota,
  texturaRayo,
  texturaCielo,
  texturaHoja,
  texturaCorteza,
  texturaFollaje,
  texturaSuelo,
  texturaLejania,
  bibliotecaVegetacion,
} from './texturas.js';
import { crearMotas } from './particulas.js';
import { crearHojasCerca, TOPE_HOJAS } from './hojas-cerca.js';
import { AJUSTES } from './ajustes.js';

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
  follaje: 1,    // cuánta hoja cercana cruza el encuadre en esta parada
};
const pose = (p) => ({ ...base, ...p });

export const PARADAS = {
  /* Cada parada trae su propia LUZ, su propia NIEBLA y su propia cantidad de
     hoja cercana. El cambio de sección no es un corte: es entrar en otra
     parte del bosque, con otra espesura y otra hora del día. */
  umbral:     pose({ camZ: 18,  camY: 2.3, mirarY: 2.4, niebla: 0.030, rayos: 0.6, velo: 1, luz: 1.02, follaje: 1.15 }),
  intro:      pose({ camZ: 6,   camY: 2.6, mirarY: 2.6, niebla: 0.024, rayos: 1, velo: .5, luz: 1.08, follaje: 0.8 }),
  sendas:     pose({ camZ: -8,  camY: 3.1, mirarY: 2.4, giro: 0.12, niebla: 0.022, rayos: 0.85, velo: .35, luz: 1.1, follaje: 0.55 }),
  linterna:   pose({ camZ: -22, camY: 1.7, mirarY: 1.9, giro: -0.08, niebla: 0.046, rayos: 0.14, polen: 0.35, luciernagas: 1, velo: .8, luz: 0.8, follaje: 1.25 }),
  galeria:    pose({ camZ: -36, camY: 3.4, mirarY: 2.7, giro: 0.06, niebla: 0.026, rayos: 0.9, polen: 1, luciernagas: 0.3, velo: .3, luz: 1.08, follaje: 0.45 }),
  manifiesto: pose({ camZ: -50, camY: 2.3, mirarY: 2.3, giro: -0.05, niebla: 0.032, rayos: 0.6, velo: .55, luz: 1, follaje: 0.85 }),
  // El claro: menos niebla, más luz y la exposición arriba. Llegar aquí tiene
  // que notarse en la piel, no sólo en el texto.
  /* El claro. La primera versión llegaba aquí con la exposición a 1,55 y lo
     que salía era blanco: los helechos del borde se iban a lima encendido y
     el follaje volvía a parecer plástico. Un claro no es «todo más brillante»,
     es MENOS NIEBLA y más rayo. La luz sube poco; lo que sube es el contraste. */
  final:      pose({ camZ: -68, camY: 3.6, mirarY: 3.1, niebla: 0.011, rayos: 1.6, polen: 1, luciernagas: 0.2, velo: .3, luz: 1.22, follaje: 0.3 }),
};

const CLAVES = Object.keys(base);

/** De dónde sale la cámara en la entrada: más atrás, más baja y con más niebla. */
const ARRANQUE = pose({ camZ: 34, camY: 1.5, mirarY: 3.2, niebla: 0.068, rayos: 0.18, polen: 0.2, luciernagas: 0, velo: 1, luz: 0.62, follaje: 2 });

const ENTRADA = { retardo: 0.15, duracion: 2.6 };

/* ── Montaje ────────────────────────────────────────────────────────── */

export function montarBosque({ contenedor, caps, reducido, alPintar }) {
  const renderer = new THREE.WebGLRenderer({ antialias: caps.antialias, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, caps.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  /* Sombras de verdad, sólo donde salen gratis.
     Es lo que más se nota de toda la fase: sin ellas la luz llega a todas
     partes por igual y el suelo se lee como una moqueta. Con un mapa de
     sombras, la copa recorta el sol y aparece el moteado que hace que un
     hayedo sea un hayedo. Es un pase extra sobre la geometría, así que en
     equipos medios y bajos ni se enciende. */
  const conSombras = caps.nivel === 'alto';
  if (conSombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const cielo = texturaCielo();
  escena.background = cielo;
  // El color de la niebla casa con la banda del horizonte del cielo: así lo
  // lejano se funde en él en vez de recortarse contra una pared de otro tono.
  const niebla = new THREE.FogExp2(0x456f52, base.niebla);
  escena.fog = niebla;

  const camara = new THREE.PerspectiveCamera(52, 1, 0.08, 400);
  // La cámara ENTRA en la escena: de ella cuelga la capa de hojas cercanas, y
  // three sólo recorre lo que está en el grafo.
  escena.add(camara);

  const mapas = {
    corteza: texturaCorteza(),
    follaje: [texturaFollaje(2), texturaFollaje(19)],
    helechos: [texturaHelecho(3), texturaHelecho(11)],
    suelo: texturaSuelo(),
    niebla: texturaNiebla(5),
    mota: texturaMota(),
    rayo: texturaRayo(),
    hoja: texturaHoja(),
    lejania: texturaLejania(),
    cielo,
  };
  const aDesechar = [];

  /* ── Luz ──────────────────────────────────────────────────────────
     Antes todo iba con materiales básicos: sin sombreado, los troncos eran
     siluetas planas y la niebla cargaba sola con la profundidad. Ahora hay
     una luz que viene de arriba y de un lado —la que se cuela entre las
     copas— y otra de relleno desde el cielo. Es lo que le da vuelta al
     tronco y hace que un cilindro se lea como un cilindro.

     Sombreado Lambert, no físico: con decenas de troncos instanciados y con
     esta niebla encima, el modelo físico no aportaría nada que se vea y sí
     costaría. */
  /* La luz aquí no está para ILUMINAR, está para dar FORMA.
     Subirla hasta ver bien el bosque destruye lo que hace que esto funcione:
     que las cosas sean siluetas oscuras recortadas contra la niebla clara. Se
     queda baja a propósito; lo único que aporta es que un tronco tenga un
     lado y otro, que es lo que le faltaba cuando era un recorte plano. */
  const colorSol = new THREE.Color(AJUSTES.colorLuz);

  /* Cuatro luces, y cada una hace un trabajo distinto:

     · cielo    — el rebote general. Verde arriba, tierra abajo. Es lo que
                  impide que las caras en sombra sean negro plano.
     · clave    — el sol que entra de lado entre las copas. Es la única que
                  proyecta sombra, y por eso las sombras tienen todas la
                  misma dirección: la suya.
     · contra   — por detrás, recorta el canto de los troncos contra la
                  niebla y evita que el bosque sea una sola masa.
     · rebote   — muy tenue y desde abajo, el verde que devuelve la hojarasca.

     En la fase anterior esto estaba deliberadamente bajo para no perder la
     silueta. Ahora sube —bastante— porque el fondo también ha subido: con un
     horizonte claro detrás, un tronco iluminado SIGUE siendo más oscuro que
     la niebla, así que la silueta aguanta y los verdes pueden vivir. */
  const luzCielo = new THREE.HemisphereLight(0xa6d0b0, 0x3b4c33, 0.95);
  escena.add(luzCielo);

  const luzClave = new THREE.DirectionalLight(colorSol, 1.85);
  luzClave.position.set(-11, 16, -4);
  if (conSombras) {
    luzClave.castShadow = true;
    luzClave.shadow.mapSize.set(1024, 1024);
    const c = luzClave.shadow.camera;
    c.left = -30; c.right = 30; c.top = 30; c.bottom = -30;
    c.near = 1; c.far = 80;
    c.updateProjectionMatrix();
    luzClave.shadow.bias = -0.0016;
    luzClave.shadow.normalBias = 0.35;
    // La sombra sólo cubre 60 m: el foco viaja con la cámara.
    escena.add(luzClave.target);
  }
  escena.add(luzClave);

  const luzContra = new THREE.DirectionalLight(0xbfe4c9, 0.85);
  luzContra.position.set(8, 6, -20);
  escena.add(luzContra);

  const luzRebote = new THREE.DirectionalLight(0x8fa86a, 0.3);
  luzRebote.position.set(2, -6, 6);
  escena.add(luzRebote);

  /** Intensidades de referencia: el ajuste de luz las multiplica todas a la vez. */
  const luzBase = [
    [luzCielo, 0.95], [luzClave, 1.85], [luzContra, 0.85], [luzRebote, 0.3],
  ];

  /* ── Suelo ─────────────────────────────────────────────────────────
     Un plano liso de 400×400 no es suelo de bosque: es una mesa. Éste está
     subdividido y ondulado con dos frecuencias —lomas anchas y bultos de
     raíz— y lleva su hojarasca. Con la niebla encima sólo se aprecia lo que
     hay cerca, que es exactamente donde se notaba que era plano. */
  // La subdivisión va con el nivel de calidad: la ondulación es suave y no
  // necesita malla fina para leerse.
  const divSuelo = caps.nivel === 'alto' ? 120 : caps.nivel === 'medio' ? 80 : 48;
  const geoSuelo = new THREE.PlaneGeometry(400, 400, divSuelo, divSuelo);
  {
    const pos = geoSuelo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // aún sin rotar: este eje será la profundidad
      const lomas = Math.sin(x * 0.055) * Math.cos(y * 0.041) * 1.15;
      const bultos = Math.sin(x * 0.31 + y * 0.19) * Math.cos(y * 0.27) * 0.22;
      // La senda por la que va la cámara se mantiene llana: si no, el suelo
      // sube y baja delante del objetivo y marea.
      const senda = Math.min(1, Math.abs(x) / 7);
      pos.setZ(i, (lomas + bultos) * senda * senda);
    }
    geoSuelo.computeVertexNormals();
  }
  const matSuelo = new THREE.MeshLambertMaterial({
    map: mapas.suelo,
    // El mapa ya es oscuro: multiplicarlo otra vez por un color oscuro dejaba
    // la mitad inferior del cuadro en negro.
    color: 0xa8bb9c,
    fog: true,
  });
  const suelo = new THREE.Mesh(geoSuelo, matSuelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.55;
  // El suelo es quien RECIBE el moteado de las copas
  suelo.receiveShadow = conSombras;
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
  /**
   * El canto de los recortes.
   *
   * Un material con `alphaTest` decide para cada píxel «dentro o fuera», sin
   * término medio: de lejos no se nota, pero un helecho que pasa a metro y
   * medio del objetivo se ve como una escalera de píxeles. Es, literalmente,
   * el aspecto de videojuego antiguo.
   *
   * `alphaToCoverage` reparte esa decisión entre las muestras del
   * multimuestreo: el mismo recorte binario sale con el canto suavizado y sin
   * ordenar transparencias ni pagar un pase extra. Sólo hay muestras que
   * repartir si el lienzo va con antialias, así que en el nivel bajo no se
   * enciende (y allí tampoco se mira tan de cerca).
   */
  function bordeSuave(material) {
    if (!caps.antialias) return material;
    material.alphaToCoverage = true;
    material.needsUpdate = true;
    return material;
  }

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

  /* ── Arbolado ─────────────────────────────────────────────────────
     Los árboles eran dos planos cruzados con una silueta pintada. Se leían
     como cartón recortado, y se notaba justo cuando más se mira: al pasar la
     cámara por su lado, porque un recorte plano no tiene canto ni vuelta.

     Ahora el TRONCO es geometría de verdad —un cilindro con conicidad,
     inclinación propia y ondulaciones— y sólo la copa sigue siendo aspa, que
     es donde un recorte se disimula entre hoja y niebla. El tronco es lo que
     cruza a un palmo del objetivo; la copa casi siempre está fuera de cuadro
     o comida por la niebla. */

  /** Tronco: cilindro afinado hacia arriba, con su curva y su bulto. */
  function geometriaTronco(alto, radio, semilla) {
    const geo = new THREE.CylinderGeometry(radio * 0.42, radio, alto, 9, 7, true);
    geo.translate(0, alto / 2, 0);
    const pos = geo.attributes.position;
    const inclina = (ruido(semilla, 3) - 0.5) * 0.9;
    const giro = ruido(semilla, 7) * 6.283;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const t = y / alto;
      // Inclinación creciente: el pie no se mueve, la punta sí
      const desvio = inclina * t * t * alto * 0.11;
      // Bultos: nudos y raíces, más marcados abajo
      const bulto = 1 + Math.sin(y * 1.7 + giro) * 0.06 * (1 - t) + Math.sin(y * 0.6 + giro * 2) * 0.05;
      pos.setX(i, x * bulto + Math.cos(giro) * desvio);
      pos.setZ(i, z * bulto + Math.sin(giro) * desvio);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const TRONCOS_DISTINTOS = 5;
  for (let k = 0; k < TRONCOS_DISTINTOS; k++) {
    const cuantos = Math.ceil(caps.arboles / TRONCOS_DISTINTOS);
    const geo = geometriaTronco(19 + ruido(k, 1) * 7, 0.42 + ruido(k, 2) * 0.34, k + 1);
    const mat = new THREE.MeshLambertMaterial({
      map: mapas.corteza,
      color: 0xffffff, // el tono lo pone cada instancia
      fog: true,
      side: THREE.DoubleSide,
    });
    // El tronco casi no se mueve: lo que se balancea de un haya es la copa
    conViento(mat, 0.1);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    const tono = new THREE.Color();
    for (let n = 0; n < cuantos; n++) {
      const lado = Math.random() > 0.5 ? 1 : -1;
      const x = lado * (3.6 + Math.pow(Math.random(), 0.62) * 26);
      const z = 28 - Math.random() * 172;
      const s = 0.62 + Math.random() * 0.9;
      dummy.position.set(x, -0.5, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.5), s);
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
      /* Cada tronco su tono. Antes iban todos casi a negro porque cargaban
         solos con la silueta; ahora el fondo es claro y pueden tener color
         de corteza —pardo con musgo— sin dejar de recortarse. */
      const v = 0.26 + Math.random() * 0.34;
      tono.setRGB(v * 1.02, v * 0.98, v * 0.74);
      malla.setColorAt(n, tono);
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.frustumCulled = false;
    malla.castShadow = conSombras;
    malla.receiveShadow = conSombras;
    escena.add(malla);
    arboledas.push(malla);
    aDesechar.push(geo, mat);
  }

  /* ── Copas ────────────────────────────────────────────────────────
     Aspas de follaje repartidas arriba. Van por encima de donde mira la
     cámara, así que lo que se ve de ellas es el techo cerrado del hayedo. */
  mapas.follaje.forEach((mapa) => {
    const cuantos = Math.round((caps.arboles * 1.8) / mapas.follaje.length);
    const geo = geometriaAspa(13, 10);
    const mat = new THREE.MeshLambertMaterial({
      map: mapa,
      // Verde de hoja al trasluz, no verde de sombra. Cada aspa lleva además
      // su propio tono por instancia: un techo de un solo verde es plástico.
      color: 0xffffff,
      alphaTest: 0.38,
      side: THREE.DoubleSide,
      fog: true,
    });
    bordeSuave(mat);
    conViento(mat, 0.85);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    const verde = new THREE.Color();
    for (let n = 0; n < cuantos; n++) {
      const lado = Math.random() > 0.5 ? 1 : -1;
      const x = lado * (1 + Math.pow(Math.random(), 0.5) * 28);
      const z = 30 - Math.random() * 176;
      const s = 0.8 + Math.random() * 1.5;
      const alto = 13 + Math.random() * 12;
      dummy.position.set(x, alto, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.24, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      dummy.scale.set(s * (0.85 + Math.random() * 0.4), s, s * (0.85 + Math.random() * 0.4));
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
      // Las de arriba les da más el sol; las de abajo quedan a la sombra de
      // las de arriba. Esa gradación vertical es la que da volumen al techo.
      const sol = (alto - 13) / 12;
      const v = 0.13 + sol * 0.26 + Math.random() * 0.12;
      verde.setRGB(v * (0.68 + Math.random() * 0.26), v * 1.04, v * 0.52);
      malla.setColorAt(n, verde);
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.frustumCulled = false;
    malla.castShadow = conSombras;
    escena.add(malla);
    arboledas.push(malla);
    aDesechar.push(geo, mat);
  });

  /* ── Sotobosque ──────────────────────────────────────────────────── */
  mapas.helechos.forEach((mapa) => {
    const cuantos = Math.round(caps.helechos / mapas.helechos.length);
    const geo = geometriaAspa(3.2, 2.2);
    const mat = new THREE.MeshLambertMaterial({
      map: mapa,
      color: 0xffffff,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      fog: true,
    });
    bordeSuave(mat);
    conViento(mat, 0.2);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    const verde = new THREE.Color();
    for (let n = 0; n < cuantos; n++) {
      const lado = Math.random() > 0.5 ? 1 : -1;
      // Apartados de la senda: pegados al objetivo, un helecho de canto se
      // lee como una mancha negra con patas cruzando el cuadro.
      const x = lado * (6.5 + Math.pow(Math.random(), 0.7) * 17);
      const z = 22 - Math.random() * 166;
      const s = 0.45 + Math.random() * 0.75;
      dummy.position.set(x, -0.45, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.26);
      dummy.scale.set(s * (0.8 + Math.random() * 0.45), s, s);
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
      const v = 0.1 + Math.random() * 0.15;
      verde.setRGB(v * 0.68, v * 1.0, v * 0.56);
      malla.setColorAt(n, verde);
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.frustumCulled = false;
    malla.castShadow = conSombras;
    malla.receiveShadow = conSombras;
    escena.add(malla);
    aDesechar.push(geo, mat);
  });

  /* ── Capa 4: la fronda del fondo ───────────────────────────────────
     Entre los helechos del suelo y los troncos faltaba una capa: matas
     medianas a media altura, las que tapan el pie del bosque y hacen que no
     se vea el suelo hasta el infinito. Es la que da la sensación de ESPESOR
     cuando la cámara avanza, porque es la que se abre y se cierra al pasar. */
  {
    const mapa = mapas.helechos[0];
    const cuantos = Math.round(caps.helechos * 0.8);
    const geo = geometriaAspa(5, 3.4);
    const mat = new THREE.MeshLambertMaterial({
      map: mapa,
      color: 0xffffff,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      fog: true,
    });
    bordeSuave(mat);
    conViento(mat, 0.4);
    const malla = new THREE.InstancedMesh(geo, mat, cuantos);
    const verde = new THREE.Color();
    for (let n = 0; n < cuantos; n++) {
      const lado = Math.random() > 0.5 ? 1 : -1;
      const x = lado * (12 + Math.pow(Math.random(), 0.8) * 20);
      const z = 24 - Math.random() * 176;
      const s = 0.7 + Math.random() * 1.1;
      dummy.position.set(x, -0.45 + Math.random() * 0.9, z);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      dummy.scale.set(s, s * (0.7 + Math.random() * 0.7), s);
      dummy.updateMatrix();
      malla.setMatrixAt(n, dummy.matrix);
      /* Estas empezaron en verde lima y se leían como calcomanías: un recorte
         con `alphaTest` tiene el canto duro, y con el canto duro sólo se salva
         si es OSCURO y la niebla lo come. Así funciona la fronda de verdad,
         además: la que está a media altura vive a la sombra de la de arriba. */
      const v = 0.1 + Math.random() * 0.16;
      verde.setRGB(v * 0.72, v * 1.0, v * 0.58);
      malla.setColorAt(n, verde);
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.frustumCulled = false;
    malla.castShadow = conSombras;
    escena.add(malla);
    arboledas.push(malla);
    aDesechar.push(geo, mat);
  }

  /* ── Capa 5: la línea de árboles lejana ────────────────────────────
     Un telón a 150 m que viaja CON la cámara, así que nunca se alcanza. No
     es decoración: sin él, donde acaba el arbolado instanciado empezaba el
     cielo liso y la profundidad se cortaba en seco. */
  const lejania = (() => {
    const geo = new THREE.PlaneGeometry(440, 78);
    const mat = new THREE.MeshBasicMaterial({
      map: mapas.lejania,
      // Casi del color de la niebla: es una insinuación de que hay más
      // bosque, no un decorado. En cuanto se lee como recorte, sobra.
      color: 0x9cc0a6,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 26, -150);
    m.renderOrder = 1;
    escena.add(m);
    aDesechar.push(geo, mat);
    return m;
  })();

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
      /* Inclinados TODOS hacia el mismo lado: la luz clave entra desde la
         izquierda y arriba, así que los rayos tienen que caer hacia la
         derecha. Un rayo apuntando al revés delata la escena al instante. */
      m.position.set((Math.random() - 0.5) * 30, 24, 16 - i * 22 - Math.random() * 9);
      m.rotation.z = 0.2 + Math.random() * 0.22;
      m.rotation.y = (Math.random() - 0.5) * 0.5;
      m.renderOrder = 4;
      escena.add(m);
      rayos.push({ malla: m, fase: Math.random() * 6.28, fuerza: 0.5 + Math.random() * 0.55 });
      aDesechar.push(mat);
    }
  }

  /* El claro: un rayo ancho al final del corredor. Sin él, llegar al final
     era salir del bosque a un campo oscuro en vez de a un claro. */
  {
    const geo = new THREE.PlaneGeometry(26, 48);
    geo.translate(0, -24, 0);
    aDesechar.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      map: mapas.rayo,
      color: 0xfff1d2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(1.5, 26, -96);
    m.rotation.z = 0.22;
    m.renderOrder = 4;
    escena.add(m);
    rayos.push({ malla: m, fase: 1.7, fuerza: 1.5 });
    aDesechar.push(mat);
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

  /* ── Niebla de suelo ──────────────────────────────────────────────
     La que se posa entre los troncos a primera hora. Aparte de ser lo que
     hace un hayedo a las siete de la mañana, resuelve un problema de
     encuadre: el suelo cercano no recibe niebla de distancia y se quedaba
     como una masa oscura ocupando el tercio de abajo. */
  const nieblasSuelo = [];
  {
    const geo = new THREE.PlaneGeometry(86, 7);
    aDesechar.push(geo);
    const cuantas = Math.max(3, Math.round(caps.nieblas * 0.7));
    for (let i = 0; i < cuantas; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: mapas.niebla,
        color: 0xdbe9de,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0.9 + Math.random() * 1.1, 16 - i * 20 - Math.random() * 10);
      m.renderOrder = 2;
      escena.add(m);
      nieblasSuelo.push({
        malla: m,
        fase: Math.random() * 6.28,
        vel: 0.03 + Math.random() * 0.07,
        base: 0.42 + Math.random() * 0.3,
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

  /* Motas de sol: las que se ven SÓLO dentro de un rayo. Son muy pocas, muy
     brillantes y muy lentas, y viven en una caja estrecha alrededor de la
     senda. Es el detalle que convence de que el aire tiene cuerpo. */
  const brillos = crearMotas({
    cuantas: Math.round(caps.polen * 0.18) + 24,
    mapa: mapas.mota,
    caja: [26, 16, 70],
    color: 0xfff3d2,
    tamano: 2.2,
    velocidad: [0.03, 0.2],
    deriva: 1.1,
    opacidad: 0,
  });
  brillos.objeto.position.y = 3;
  escena.add(brillos.objeto);

  /* ── Capa 0: las hojas que rozan la cara ──────────────────────────
     Va aparte, en su propio archivo, porque no pertenece al bosque: cuelga
     de la cámara. Ver `hojas-cerca.js`. */
  const hojasCerca = crearHojasCerca({
    camara,
    biblioteca: bibliotecaVegetacion(caps.nivel),
    caps,
    reducido,
    ajustes: AJUSTES,
  });

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
  let fotogramas = 0;
  const mira = new THREE.Vector3();
  // Velocidad de desplazamiento: NO mueve la cámara —la pose sigue siendo
  // función pura del scroll—, sólo empuja las hojas cercanas y la brisa.
  let scrollAnterior = window.scrollY;
  let velScroll = 0;
  /* La luz clave, expresada en ESPACIO DE CÁMARA. Las hojas cercanas cuelgan
     de la cámara, así que su espacio local ES el de la cámara: para que se
     iluminen con el mismo sol que el bosque hay que darles la dirección ya
     transformada. Se calcula una vez por fotograma y se comparte. */
  const luzEnCamara = new THREE.Vector3();

  /* Freno automático.
   *
   * `medirEquipo()` adivina la potencia por los núcleos y la memoria, y se
   * equivoca a menudo: un teléfono nuevo con la batería baja, una pestaña en
   * segundo plano, un portátil con la gráfica integrada. Esto no adivina,
   * MIDE: si el fotograma medio se pasa de 34 ms (por debajo de 30 por
   * segundo) durante dos segundos seguidos, baja un escalón de calidad.
   *
   * Sólo baja, nunca sube: si subiera, entraría en un vaivén —baja, mejora,
   * sube, empeora— que se nota mucho más que ir un escalón por debajo. Y se
   * para a los dos escalones, para no dejar la escena pelada.
   */
  let medioFotograma = 16;
  let lento = 0;
  let escalon = 0;
  const FRENOS = [1, 0.62, 0.34];

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
    // Lo que ha tardado de verdad, SIN acotar: el delta acotado sirve para
    // animar, pero para medir el coste hay que mirar el reloj de pared.
    const transcurrido = Math.max(0, ahora - anterior);
    const dt = Math.min(transcurrido / 1000, 0.25);
    anterior = ahora;

    /* Media móvil del coste del fotograma, ciega a los saltos sueltos.
       El factor va con el TIEMPO, no con el número de fotogramas: si fuese
       por fotogramas, justo en el caso que interesa —los fotogramas largos—
       la media tardaría una eternidad en enterarse. */
    const mezcla = Math.min(1, (transcurrido / 1000) * 3);
    medioFotograma += (Math.min(transcurrido, 400) - medioFotograma) * mezcla;
    if (escalon < FRENOS.length - 1 && visible) {
      lento = medioFotograma > 34 ? lento + transcurrido / 1000 : 0;
      if (lento > 2) {
        escalon++;
        lento = 0;
        if (escalon >= FRENOS.length - 1) renderer.setPixelRatio(1);
      }
    }
    const freno = FRENOS[escalon];

    reloj += dt * movimiento * visible * AJUSTES.brisa;
    viento.value = reloj;

    const y = window.scrollY;
    // Amortiguada por los dos lados: un golpe de rueda no puede dar un tirón
    const cruda = Math.abs(y - scrollAnterior) / Math.max(dt, 0.004) / 1500;
    scrollAnterior = y;
    velScroll = damp(velScroll, Math.min(cruda, 2), cruda > velScroll ? 7 : 2.4, dt);

    poseEn(y, objetivo);

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
    const mCam = movimiento * AJUSTES.movimientoCamara;
    const paralajeX = st.suaveX * 2.7 * mCam * AJUSTES.paralaje;
    const paralajeY = -st.suaveY * 1.3 * mCam * AJUSTES.paralaje;
    const respira = Math.sin(reloj * 0.42) * 0.16 * mCam;
    // La cámara nunca gira de golpe: todo lo que la mueve ya viene amortiguado
    camara.rotation.z = 0;
    const dolly = (AJUSTES.distanciaCamara - 1) * 9;
    camara.position.set(st.camX + paralajeX, st.camY + paralajeY + respira, st.camZ + dolly);
    mira.set(
      st.giro * 14 + paralajeX * 0.35,
      st.mirarY + paralajeY * 0.4,
      st.camZ + dolly - 24,
    );
    camara.lookAt(mira);
    camara.rotateZ(Math.sin(reloj * 0.23) * 0.012 * mCam - st.suaveX * 0.02 * mCam);
    // Las hojas cuelgan de la cámara: hay que refrescar sus matrices ahora,
    // después de mover el padre y antes de colocarlas.
    camara.updateMatrixWorld();

    niebla.density = st.niebla * AJUSTES.niebla;
    // En vertical entra mucha menos escena y el bosque se quedaba a oscuras
    // detrás del texto: se abre un poco el diafragma.
    const exposicion = 1.05 * st.luz * AJUSTES.luz * (camara.aspect < 1 ? 1.22 : 1);
    renderer.toneMappingExposure = exposicion;

    // ── Luz: sube y baja con el recorrido ─────────────────────────────
    // Un tramo puede ser más cerrado que otro sin que la exposición cargue
    // sola con el cambio: la luz misma se atenúa, y así las sombras también.
    // Techo en la intensidad: pasado cierto punto lo único que aporta subirla
    // es quemar los verdes claros, que es justo lo que había que evitar.
    const fuerzaLuz = Math.min(1.22, (0.6 + st.luz * 0.4) * AJUSTES.luz);
    for (const [luz, ref] of luzBase) luz.intensity = ref * fuerzaLuz;
    luzClave.color.set(AJUSTES.colorLuz);
    if (conSombras) {
      // El foco de sombra viaja con la cámara: 60 m de mapa bastan para lo
      // que se ve, y así el moteado del suelo no se queda atrás.
      luzClave.position.set(st.camX - 11, 16, st.camZ - 4);
      luzClave.target.position.set(st.camX, 0, st.camZ - 14);
      luzClave.target.updateMatrixWorld();
    }

    // Telón del fondo: viaja con la cámara para no alcanzarse nunca
    lejania.position.z = st.camZ - 150;
    lejania.material.opacity = 0.42 * clamp(1 - st.niebla * 12);

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

    // ── Niebla de suelo ───────────────────────────────────────────────
    for (const n of nieblasSuelo) {
      n.malla.position.x = Math.sin(reloj * n.vel + n.fase) * 9;
      // El velo se aclara con la distancia recorrida para que la escena
      // nocturna quede más cerrada y el claro del final, despejado.
      n.malla.material.opacity = st.velo * n.base;
      n.malla.visible = n.malla.material.opacity > 0.006;
    }

    // ── Motas ─────────────────────────────────────────────────────────
    const part = AJUSTES.particulas * freno;
    polen.avanzar(reloj);
    luciernagas.avanzar(reloj);
    hojas.avanzar(reloj);
    brillos.avanzar(reloj);
    polen.opacidad = st.polen * 0.55 * part;
    luciernagas.opacidad = st.luciernagas * 0.95 * part;
    hojas.opacidad = st.polen * 0.62 * part;
    // Las motas de sol sólo se encienden donde hay rayo que las encienda
    brillos.opacidad = st.rayos * 0.42 * part;
    polen.objeto.position.z = st.camZ - 40;
    luciernagas.objeto.position.z = st.camZ - 22;
    hojas.objeto.position.z = st.camZ - 34;
    brillos.objeto.position.z = st.camZ - 16;

    /* La luz clave, llevada al espacio de la cámara para la capa cercana.
       `transformDirection` normaliza y sólo aplica la rotación, que es lo que
       corresponde a una dirección: aplicarle la traslación la estropearía. */
    luzEnCamara
      .copy(luzClave.position)
      .sub(luzClave.target.position)
      .normalize()
      .transformDirection(camara.matrixWorldInverse);
    hojasCerca.fijarLuz(luzEnCamara, luzClave.color);

    // ── Capa 0: las hojas que rozan la cara ───────────────────────────
    // La entrada empieza con el follaje CERRADO sobre el objetivo y se abre:
    // primero las hojas se apartan, después aparece el bosque, y sólo
    // entonces entra el texto.
    if (reducido) {
      hojasCerca.congelar();
    } else {
      hojasCerca.avanzar(dt, {
        velScroll,
        punteroX: st.suaveX,
        punteroY: st.suaveY,
        cierre: clamp(1 - st.entrada / 0.55),
        luz: st.luz * AJUSTES.luz,
        // Cada parada trae su espesura: el sotobosque de la linterna está
        // cerrado, el claro del final está despejado.
        follaje: st.follaje * freno,
        reloj,
        movimiento,
      });
    }

    renderer.render(escena, camara);
    fotogramas++;

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
    window.__bosqueUM = {
      escena, camara, arboledas, rayos, velos, polen, luciernagas, hojas, hojasCerca, st, AJUSTES,
      get fotogramas() { return fotogramas; },
    };
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
    /** Fotogramas pintados. Sirve para esperar a que la escena se asiente
     *  contando fotogramas de verdad y no milisegundos de reloj. */
    get fotogramas() {
      return fotogramas;
    },
    /** Escalón del freno automático: 0 = a plena calidad. Para diagnóstico. */
    get freno() {
      return { escalon, medioFotograma: Math.round(medioFotograma) };
    },
    /** Tope de hojas cercanas que aguanta este equipo, para el panel. */
    get topeHojas() {
      return TOPE_HOJAS[caps.nivel] || TOPE_HOJAS.medio;
    },
    /** Los ajustes vivos: el panel escribe aquí y se ve en el fotograma siguiente. */
    ajustes: AJUSTES,
    destruir() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', redimensionar);
      document.removeEventListener('visibilitychange', alVisibilidad);
      polen.liberar();
      luciernagas.liberar();
      hojas.liberar();
      brillos.liberar();
      hojasCerca.liberar();
      aDesechar.forEach((o) => o.dispose?.());
      Object.values(mapas).flat().forEach((t) => t.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
