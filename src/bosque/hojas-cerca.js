/**
 * La vegetación que roza la cara.
 *
 * La capa más cercana del recorrido, y la única que NO vive en el bosque:
 * cuelga de la CÁMARA. Ése es el truco de base. Un follaje colocado en el
 * mundo a medio metro del objetivo se queda atrás en cuanto la cámara avanza;
 * uno colgado de la cámara viaja siempre con ella y cruza el encuadre a la
 * velocidad que uno quiera, que es lo que hace una rama cuando le pasas por
 * debajo.
 *
 * Lo que cambió en esta fase: antes eran cuadriláteros PLANOS de cuatro
 * vértices con un material que no recibe luz. Por mucha textura bonita que
 * llevaran, no podían tener volumen —no hay superficie donde se vea un
 * degradado ni luz que lo provoque—, y se leían como calcomanías pegadas a la
 * pantalla. Ahora cada pieza es una malla curvada con su sombreador, iluminada
 * por la misma luz clave del bosque. Ver `hoja-geometria.js` y
 * `hoja-material.js`.
 *
 * Las piezas de referencia (starter-components, CC0) siguen mandando:
 *
 *   · `three-d-stage`  — la escena por CAPAS de profundidad, y la luz de la
 *     escena se pasa a esta capa en espacio de cámara para que el sol sea el
 *     mismo aquí y a cincuenta metros.
 *   · `image-slot`     — nada se coloca en unidades fijas: todo en PROPORCIÓN
 *     AL ENCUADRE, ahora también el tamaño y el apartarse del cursor.
 *   · `animations-v3`  — el scroll, el viento y el puntero no MUEVEN nada:
 *     empujan un valor que después se amortigua y se recupera solo.
 */

import * as THREE from 'three';
import { clamp, damp, lerp, azarCon } from '../lib/util.js';
import { perfiles } from './hoja-geometria.js';
import { materialDeHoja } from './hoja-material.js';

const GRADOS = Math.PI / 180;

/** Cuántas piezas soporta cada nivel de equipo, como tope del ajuste. */
export const TOPE_HOJAS = { alto: 32, medio: 20, bajo: 10 };

/**
 * Cómo se comporta cada tipo de pieza. El reparto entre hoja suelta y
 * conjunto lo decide el ajuste `proporcionHojas`; dentro de cada grupo, estos
 * pesos relativos.
 */
const SUELTAS = ['haya', 'roble', 'acebo', 'avellano', 'castano'];
const CONJUNTOS = ['grupo', 'ramita', 'fronda', 'rama'];

/** Tamaño y comportamiento propios de cada forma, en proporción al encuadre. */
const RASGOS = {
  haya:     { tam: [0.14, 0.30], relacion: 1,    viento: 1,    asoma: 0.02 },
  roble:    { tam: [0.15, 0.32], relacion: 1,    viento: 1,    asoma: 0.02 },
  acebo:    { tam: [0.12, 0.26], relacion: 1,    viento: 0.7,  asoma: 0.02 },
  avellano: { tam: [0.15, 0.31], relacion: 1,    viento: 1.05, asoma: 0.02 },
  castano:  { tam: [0.17, 0.36], relacion: 0.72, viento: 1.1,  asoma: 0.02 },
  grupo:    { tam: [0.20, 0.38], relacion: 1.1,  viento: 0.85, asoma: 0.18 },
  ramita:   { tam: [0.26, 0.46], relacion: 0.7,  viento: 1.25, asoma: 0.3 },
  fronda:   { tam: [0.26, 0.5],  relacion: 0.62, viento: 1.4,  asoma: 0.34 },
  // La rama es la pieza grande, pero «grande» aquí es media pantalla, no
  // pantalla y media: si tapa el encuadre deja de ser una rama y es un telón.
  rama:     { tam: [0.36, 0.62], relacion: 1.25, viento: 0.45, asoma: 0.55 },
};

/**
 * @param {object} op
 * @param {THREE.PerspectiveCamera} op.camara
 * @param {Array} op.biblioteca  salida de `bibliotecaVegetacion()`
 * @param {object} op.caps  medida del equipo
 * @param {boolean} op.reducido
 * @param {object} op.ajustes  objeto AJUSTES vivo
 */
export function crearHojasCerca({ camara, biblioteca, caps, reducido, ajustes }) {
  const grupo = new THREE.Group();
  grupo.renderOrder = 9;
  // Cuelga de la cámara: sus coordenadas SON coordenadas de cámara.
  camara.add(grupo);

  const geos = perfiles(caps.nivel);
  const tope = TOPE_HOJAS[caps.nivel] || TOPE_HOJAS.medio;
  const azar = azarCon(90210);
  const sinTorsion = caps.nivel === 'bajo';

  /* Paleta.
     Una hoja que pasa DELANTE del objetivo tiene la luz detrás: se ve a
     contraluz, honda y desaturada, no iluminada de frente. Éstos son los
     colores BASE; lo que los levanta o los apaga es el material, según hacia
     dónde mire la hoja. Nada de verde lima: es lo que convierte un hayedo en
     un decorado de plástico. */
  const PALETA = [
    0x3a5636, 0x2a422d, 0x46653e, 0x304c2c, 0x55703f,
    0x6b7c45, 0x233827, 0x415e3c, 0x5c7340, 0x4e5f34,
    // Dos de otoño, y sólo dos: son la excepción que se nota, no la norma
    0x76683a, 0x7a6236,
  ];

  /** Índices de la biblioteca por especie, para no buscar en cada reparto. */
  const porEspecie = new Map();
  biblioteca.forEach((p) => {
    if (!porEspecie.has(p.especie)) porEspecie.set(p.especie, []);
    porEspecie.get(p.especie).push(p);
  });

  const piezas = [];
  const luzDir = new THREE.Vector3(-0.5, 0.7, 0.5);
  const luzColor = new THREE.Color(0xffe7b4);

  /** Medio encuadre a una profundidad dada. Aquí está la parte de image-slot. */
  function marco(z) {
    const mitadAlto = Math.tan((camara.fov / 2) * GRADOS) * z;
    return { h: mitadAlto, w: mitadAlto * camara.aspect };
  }

  /** Elige especie respetando el reparto entre hojas sueltas y conjuntos. */
  function elegirEspecie() {
    const sueltas = clamp(ajustes.proporcionHojas, 0, 1);
    const lista = azar() < sueltas ? SUELTAS : CONJUNTOS;
    const disponibles = lista.filter((e) => porEspecie.has(e));
    return disponibles[Math.floor(azar() * disponibles.length)] || 'haya';
  }

  /**
   * Reparte una pieza: qué es, de qué lado entra, por dónde va, a qué
   * profundidad y a qué velocidad. Se llama al crearla y cada vez que termina
   * su viaje, así que ninguna repite trayecto y no aparece patrón.
   */
  function repartir(p, primera = false) {
    const especie = elegirEspecie();
    const variantes = porEspecie.get(especie);
    const elegida = variantes[Math.floor(azar() * variantes.length)];
    const rasgos = RASGOS[especie];

    // La geometría se comparte: cambiarla es sólo apuntar a otra
    if (p.malla.geometry !== geos[elegida.perfil]) p.malla.geometry = geos[elegida.perfil];
    p.malla.material.uniforms.uMapa.value = elegida.mapa;
    p.especie = especie;

    /* Profundidad. Tres franjas, pero el reparto es CONTINUO dentro de cada
       una: lo que separa «pegada al cristal» de «a media distancia» no es un
       escalón, es cuánto sesgo de mipmap lleva y cuánto corre. */
    const zMin = Math.max(0.2, ajustes.distanciaMin);
    const zMax = Math.max(zMin + 0.2, ajustes.distanciaMax);
    p.z = zMin + Math.pow(azar(), 1.45) * (zMax - zMin);
    const cercania = clamp((zMax - p.z) / (zMax - zMin));
    p.cercania = cercania;

    /* Desenfoque por distancia, CONTINUO. Antes eran tres copias horneadas de
       cada forma y se veía el salto entre niveles. Ahora es un sesgo de
       mipmap: cuanto más cerca del cristal, más borrosa, sin escalones y sin
       texturas de más. */
    /* Tope en 2,2: más allá se lee un nivel de cuatro por cuatro téxeles, que
       ya no es una hoja desenfocada sino una mancha, y encima pierde el alfa
       del recorte y se convierte en un rectángulo pálido. */
    p.sesgo = Math.pow(cercania, 1.6) * 2.2;

    p.lado = azar() > 0.5 ? 1 : -1;

    /* Dos maneras de estar en el encuadre:

       · VIAJA (la mayoría) — entra por un lateral, se mete un trozo y se va.
       · ASOMA — no viaja: cuelga de un borde con la base FUERA del encuadre,
         se mece y se retira despacio. Es lo que hacía falta para que la capa
         pareciese parte de un árbol y no hojas sueltas flotando; una rama que
         nace fuera de cuadro cuenta que ahí al lado hay un tronco. */
    p.asoma = azar() < rasgos.asoma * ajustes.proporcionAsoman * 2;

    /* De las que viajan, sólo una minoría cruza de lado a lado, y siempre por
       arriba o por abajo: el centro es donde vive el texto. */
    p.cruza = !p.asoma && azar() < clamp(ajustes.cruces, 0, 0.6);
    p.fuera = 1.28 + azar() * 0.4;
    /* `dentro` es el punto MÁS INTERIOR del viaje, en proporción al encuadre y
       medido en el propio lado de la pieza: 0,95 apenas asoma por el canto,
       0,15 se mete hasta cerca del centro.

       Antes esto era una DISTANCIA que se restaba, y salían las cuentas mal:
       con `fuera` 1,4 y `dentro` 0,5 el punto interior quedaba en −0,5, o sea
       que la pieza cruzaba el centro entera. Media capa hacía justo lo que el
       encargo pedía evitar —pasar por el medio— mientras el código creía que
       estaba rozando el borde. */
    p.dentro = 0.15 + Math.pow(azar(), 0.8) * 0.8;

    const altura = p.cruza
      ? (azar() > 0.5 ? 1 : -1) * (0.5 + azar() * 0.45)
      : (azar() - 0.5) * 1.9;
    p.v0 = altura + (azar() - 0.5) * 0.3;
    p.v1 = altura + (azar() - 0.5) * 0.8;
    p.arco = (azar() - 0.5) * 0.7;
    p.serpentea = 0.5 + azar() * 1.6;

    // La que asoma se ancla a un borde: abajo, arriba o un lateral
    if (p.asoma) {
      const bordes = ['lateral', 'lateral', 'arriba', 'abajo'];
      p.borde = bordes[Math.floor(azar() * bordes.length)];
      p.anclaU = p.borde === 'lateral' ? p.lado * (0.72 + azar() * 0.45) : (azar() - 0.5) * 1.5;
      p.anclaV = p.borde === 'arriba' ? 0.85 + azar() * 0.4
        : p.borde === 'abajo' ? -(0.85 + azar() * 0.4)
          : (azar() - 0.5) * 1.1;
      // Gira para que la base apunte hacia fuera del encuadre
      p.anclaGiro = p.borde === 'arriba' ? Math.PI
        : p.borde === 'abajo' ? 0
          : p.lado * Math.PI * 0.5 + (azar() - 0.5) * 0.5;
      // Viven más que las que viajan, pero tampoco eternamente
      p.vel = 0.018 + azar() * 0.02;
    } else {
      // Cuanto más cerca, más rápido pasa: es lo que da la sensación de roce
      p.vel = (0.05 + azar() * 0.07) * (0.5 + cercania * 1.45);
    }

    /* Tamaño en proporción al encuadre, con su relación de aspecto propia:
       una fronda es larga y estrecha, una rama ancha. Todo dentro de los
       topes del ajuste, que es lo que el panel deja mover. */
    const [tMin, tMax] = rasgos.tam;
    const escalaBase = lerp(ajustes.tamanoMin, ajustes.tamanoMax, azar());
    p.escala = escalaBase * lerp(tMin, tMax, azar()) * 2.3 * (0.6 + cercania * 0.62);
    p.relacion = rasgos.relacion * (0.88 + azar() * 0.26);

    p.giro0 = azar() * 6.283;
    p.giroVel = (azar() - 0.5) * 0.9;
    p.cabeceo = (azar() - 0.5) * 1.1;
    /* Inclinación en las TRES dimensiones, no sólo el giro dentro del plano.
       Sin esto todas las piezas miran de frente al objetivo, sus normales
       apuntan al mismo sitio y todas reciben exactamente la misma luz: se
       vuelven a leer como recortes, ahora encima apagados. Ladeándolas, cada
       una coge el sol por un lado distinto —una de canto se enciende por
       transmisión, otra de plano coge el difuso— y ahí aparece el volumen. */
    p.ladeoX = (azar() - 0.5) * 1.5;
    p.ladeoY = (azar() - 0.5) * 1.5;
    p.vientoPropio = rasgos.viento * (0.75 + azar() * 0.55);
    p.ritmo = 0.7 + azar() * 0.75;
    p.p = primera ? azar() : 0;

    const u = p.malla.material.uniforms;
    u.uColor.value.setHex(PALETA[Math.floor(azar() * PALETA.length)]);
    u.uFase.value = azar() * 6.283;
    u.uRitmo.value = p.ritmo;
    // Cuanto más cerca, más apagada: está más fuera de foco y más a contraluz
    p.tono = 0.5 + (1 - cercania) * 0.34;
  }

  /* Puesto de CIERRE: dónde se coloca cada pieza cuando la entrada arranca con
     el follaje cerrado sobre el objetivo. Una rejilla repartida por todo el
     encuadre, con su pizca de azar para que la rejilla no se vea. */
  function puestoDeCierre(i, total) {
    const cols = Math.max(2, Math.round(Math.sqrt(total * 1.5)));
    const filas = Math.max(2, Math.ceil(total / cols));
    return {
      cu: ((i % cols) + 0.5) / cols * 2.1 - 1.05 + (azar() - 0.5) * 0.5,
      cv: ((Math.floor(i / cols) % filas) + 0.5) / filas * 2.1 - 1.05 + (azar() - 0.5) * 0.5,
    };
  }

  /**
   * Dónde está una pieza en su recorrido, en proporción al encuadre.
   * Se llama dos veces por fotograma —en `t` y un pelín después— porque de la
   * diferencia sale la dirección de viaje.
   */
  function recorrido(p, t, brisa) {
    if (p.asoma) {
      /* La que asoma no viaja: entra despacio desde fuera, se queda meciéndose
         y se retira. El vaivén es el del propio borde del encuadre. */
      const dentro = Math.sin(clamp(t) * Math.PI);
      const hacia = p.borde === 'arriba' ? -1 : p.borde === 'abajo' ? 1 : -p.lado;
      const avance = dentro * 0.34;
      return {
        u: p.anclaU + (p.borde === 'lateral' ? hacia * avance : 0),
        v: p.anclaV + (p.borde === 'lateral' ? 0 : hacia * avance)
          + Math.sin(t * 5.1 + p.giro0) * 0.03 * brisa,
      };
    }
    const u = p.cruza
      ? p.lado * (p.fuera - t * p.fuera * 2)
      // Sale de fuera, llega a `dentro` a mitad de viaje y se retira: una
      // curva, no una recta, y siempre por su lado.
      : p.lado * (p.fuera + (p.dentro - p.fuera) * Math.sin(t * Math.PI));
    const v = lerp(p.v0, p.v1, t)
      + Math.sin(t * Math.PI) * p.arco
      + Math.sin(t * p.serpentea * 6.283 + p.giro0) * 0.07 * brisa;
    return { u, v };
  }

  function nacer(i) {
    const mat = materialDeHoja();
    mat.uniforms.uLuzDir.value = luzDir;
    mat.uniforms.uLuzColor.value = luzColor;
    const malla = new THREE.Mesh(geos.hoja, mat);
    // Sin prueba de profundidad hay que fijar el orden: van por encima de todo
    // y entre ellas las ordena three de atrás hacia delante.
    malla.renderOrder = 20;
    /* Pivote aparte: en él van la posición, el ángulo de viaje y el apartarse
       del cursor; en la malla, la inclinación propia de la pieza. Separarlos
       permite que cada cosa se amortigüe a su ritmo. */
    const pivote = new THREE.Object3D();
    pivote.add(malla);
    grupo.add(pivote);
    const p = { pivote, malla, apX: 0, apY: 0 };
    repartir(p, true);
    Object.assign(p, puestoDeCierre(i, tope));
    piezas.push(p);
    return p;
  }

  for (let i = 0; i < tope; i++) nacer(i);

  let empuje = 0;      // lo que aporta el scroll y el puntero, amortiguado
  let cierreSuave = 0; // 1 = follaje cerrado sobre el objetivo (la entrada)

  const api = {
    objeto: grupo,

    /**
     * La luz clave del bosque, en espacio de cámara. La escena la calcula una
     * vez por fotograma y la pasa aquí: así el sol de la hoja que roza la cara
     * es EL MISMO que el que atraviesa las copas al fondo.
     */
    fijarLuz(dirEnCamara, color) {
      luzDir.copy(dirEnCamara);
      luzColor.copy(color);
    },

    /**
     * @param {number} dt  delta acotado, en segundos
     * @param {object} ctx { velScroll, punteroX, punteroY, cierre, luz, follaje, movimiento, reloj }
     */
    avanzar(dt, ctx) {
      // La espesura de la parada decide cuántas cruzan y con cuánto cuerpo
      const espesura = ctx.follaje ?? 1;
      /* En vertical el encuadre es estrecho y las mismas piezas se amontonan:
         la misma cantidad que en un portátil llena la pantalla de un móvil.
         Se recortan a poco más de la mitad, y de paso el teléfono respira. */
      const estrecho = camara.aspect < 1 ? 0.58 : 1;
      const cuantas = Math.min(
        tope,
        Math.max(0, Math.round(ajustes.hojas * clamp(espesura, 0, 2) * estrecho)),
      );
      const brisa = ajustes.brisa * ajustes.viento;
      const mov = ctx.movimiento;

      // El empujón: scroll y puntero suman, y se amortigua. Nunca se aplica
      // en crudo, o cada golpe de rueda daría un tirón.
      const deseo = clamp(ctx.velScroll, 0, 1.8) + Math.abs(ctx.punteroX) * 0.35;
      empuje = damp(empuje, deseo * mov, 3.2, dt);
      cierreSuave = damp(cierreSuave, ctx.cierre, 5, dt);

      const paso = dt * ajustes.velocidadHojas * (0.62 + empuje * 0.9) * mov;
      const reaccion = ajustes.reaccionPuntero;

      for (let i = 0; i < piezas.length; i++) {
        const p = piezas[i];
        if (i >= cuantas) {
          p.pivote.visible = false;
          continue;
        }
        p.pivote.visible = true;

        p.p += paso * p.vel * 6;
        if (p.p >= 1) repartir(p);

        const t = p.p;
        // Profundidad: al cerrarse la entrada, todas se echan encima del
        // cristal; al abrirse, vuelven a su sitio.
        const z = lerp(p.z, 0.3, cierreSuave * 0.85) * ajustes.distanciaCamara;
        const m = marco(z);

        const aqui = recorrido(p, t, brisa);
        const luego = recorrido(p, Math.min(1, t + 0.02), brisa);
        let u = aqui.u;
        let v = aqui.v;

        // Durante la entrada ocupan su puesto en la rejilla —tapando el
        // encuadre entero— y desde ahí se apartan cada una por su lado.
        if (cierreSuave > 0.002) {
          u = lerp(u, p.cu, cierreSuave);
          v = lerp(v, p.cv, cierreSuave);
        }

        // El puntero ladea la capa entera: la más cercana es la que más se
        // mueve, que es como funciona el paralaje de verdad.
        const desvio = ajustes.paralaje * (1.1 - p.cercania * 0.45);
        u -= ctx.punteroX * 0.16 * desvio;
        v += ctx.punteroY * 0.11 * desvio;

        /* El bosque nota que hay alguien.
           Si el cursor se acerca a una pieza, ésta se aparta un poco —más
           cuanto más cerca— y luego vuelve sola a su sitio. La clave es que el
           empujón se amortigua en los dos sentidos: apartarse cuesta, volver
           cuesta más. Sin eso, la planta SIGUE al cursor y parece un juego. */
        let quieroX = 0;
        let quieroY = 0;
        if (reaccion > 0.001 && mov) {
          const dx = u - ctx.punteroX;
          const dy = v + ctx.punteroY;
          const d = Math.hypot(dx, dy);
          const radio = 0.55;
          if (d < radio && d > 1e-4) {
            const fuerza = (1 - d / radio) ** 2 * 0.17 * reaccion;
            quieroX = (dx / d) * fuerza;
            quieroY = (dy / d) * fuerza;
          }
        }
        // Apartarse es rápido; recuperar la posición, lento. Ésa es la
        // diferencia entre una planta que se aparta y una que persigue.
        const veloz = Math.abs(quieroX) > Math.abs(p.apX);
        p.apX = damp(p.apX, quieroX, veloz ? 5.5 : 1.5, dt);
        p.apY = damp(p.apY, quieroY, veloz ? 5.5 : 1.5, dt);
        u += p.apX;
        v += p.apY;

        p.pivote.position.set(u * m.w, v * m.h, -z);

        // Ángulo de viaje, medido del propio recorrido: así el arrastre va
        // siempre en la dirección real, también en las curvas.
        const angulo = p.asoma
          ? p.anclaGiro + Math.sin(ctx.reloj * 0.5 * p.ritmo + p.giro0) * 0.06 * brisa
          : Math.atan2((luego.v - aqui.v) * m.h, (luego.u - aqui.u) * m.w);
        p.pivote.rotation.z = angulo;

        // Arrastre en la dirección del movimiento, con tope: el «desenfoque de
        // movimiento», hecho con una escala anisótropa y no con posprocesado.
        const arrastre = p.asoma
          ? 1
          : 1 + clamp((empuje * 0.3 + p.cercania * 0.24) * ajustes.desenfoque, 0, 0.2);
        // Cerradas son más grandes: es follaje pegado a la lente
        const tam = p.escala * m.h * (1 + cierreSuave * 0.85);
        p.pivote.scale.set(tam * arrastre * p.relacion, tam, 1);

        // Inclinación propia dentro del pivote, con su cabeceo encima
        p.malla.rotation.x = p.ladeoX + Math.sin(ctx.reloj * 0.37 * p.ritmo + p.giro0) * 0.18 * brisa;
        p.malla.rotation.y = p.ladeoY + Math.sin(ctx.reloj * 0.55 * p.giroVel + p.giro0) * p.cabeceo * 0.5;
        if (!p.asoma) {
          p.malla.rotation.z = p.giro0 - angulo + Math.sin(ctx.reloj * 0.4 + p.giro0) * 0.22 * brisa;
        }

        // Aparece y desaparece en los extremos del viaje: nada da un salto
        const margen = p.asoma ? 0.24 : 0.12;
        const entra = clamp(t / margen);
        const sale = clamp((1 - t) / (margen + 0.02));
        let alfa = Math.min(entra, sale) * ajustes.opacidadHojas * p.tono;
        /* Presencia. Aquí estuvo el error más caro de esta fase: con el
           material nuevo las piezas quedaban en un 27 % de opacidad y se veían
           como fantasmas. No era cosa de la luz —que estaba bien— sino de que
           el factor de apertura venía heredado de cuando la textura llevaba su
           propio sombreado pintado y aguantaba el tipo a media transparencia.
           Una hoja a un palmo del objetivo TAPA lo que hay detrás. */
        alfa *= lerp(0.95, 1.6, cierreSuave) * clamp(espesura, 0, 1.2);
        /* Lo muy desenfocado va también más tenue. Es óptica, no gusto: algo
           fuera de foco delante del objetivo pierde contraste, no sólo nitidez.
           Sin esto, las piezas más cercanas eran manchas pálidas y opacas. */
        alfa *= 1 - clamp(p.cercania, 0, 1) * 0.3;

        /* Zona de respeto: si una pieza se planta sobre el centro del cuadro
           —que es donde vive el texto— se vuelve casi transparente. Pasar por
           delante del título, sí; taparlo, no. */
        if (cierreSuave < 0.25 && Math.abs(u) < 0.5 && Math.abs(v) < 0.34) {
          alfa *= lerp(0.3, 1, Math.max(Math.abs(u) / 0.5, Math.abs(v) / 0.34));
        }

        const un = p.malla.material.uniforms;
        un.uOpacidad.value = clamp(alfa * (0.62 + ctx.luz * 0.3), 0, 1);
        un.uSesgo.value = p.sesgo * ajustes.desenfoqueDistancia;
        un.uTiempo.value = ctx.reloj;
        un.uViento.value = p.vientoPropio * brisa;
        un.uTorsion.value = sinTorsion ? 0 : p.vientoPropio * ajustes.torsion;
        un.uTransmision.value = ajustes.transmision;
        un.uBorde.value = ajustes.borde;
        un.uSaturacion.value = ajustes.saturacion;
        // Ambiente bajo a propósito: la vegetación cercana tiene que ser MÁS
        // OSCURA que la niebla del fondo. La silueta contra la bruma es lo que
        // da la lectura; una hoja más clara que el aire flota.
        un.uAmbiente.value = 0.2 + ctx.luz * 0.1;
        p.malla.visible = un.uOpacidad.value > 0.01;
      }
    },

    /**
     * Versión quieta para quien pide menos movimiento. Sigue habiendo
     * vegetación —repartida por los bordes y bien compuesta—, sólo que no
     * viaja: lo que se quita es el movimiento, no el bosque.
     */
    congelar() {
      const cuantas = Math.min(9, piezas.length);
      piezas.forEach((p, i) => {
        const visible = i < cuantas;
        p.pivote.visible = visible;
        if (!visible) return;
        p.p = 0.34 + (i % 4) * 0.11;
        const m = marco(p.z);
        const { u, v } = recorrido(p, p.p, 0);
        p.pivote.position.set(u * m.w, v * m.h, -p.z);
        p.pivote.rotation.z = p.asoma ? p.anclaGiro : p.giro0;
        p.malla.rotation.set(p.ladeoX, p.ladeoY, 0);
        const tam = p.escala * m.h;
        p.pivote.scale.set(tam * p.relacion, tam, 1);
        const un = p.malla.material.uniforms;
        un.uOpacidad.value = 0.62 * ajustes.opacidadHojas * p.tono;
        un.uSesgo.value = p.sesgo * ajustes.desenfoqueDistancia;
        un.uViento.value = 0;
        un.uTorsion.value = 0;
        un.uTransmision.value = ajustes.transmision;
        un.uBorde.value = ajustes.borde;
        un.uSaturacion.value = ajustes.saturacion;
        p.malla.visible = true;
      });
    },

    /** Para las pruebas y el panel: qué formas hay ahora mismo en el encuadre. */
    get inventario() {
      return piezas
        .filter((p) => p.pivote.visible && p.malla.visible)
        .map((p) => ({ especie: p.especie, asoma: !!p.asoma, z: +p.z.toFixed(2) }));
    },

    liberar() {
      piezas.forEach((p) => p.malla.material.dispose());
      Object.values(geos).forEach((g) => g.dispose());
      biblioteca.forEach((b) => b.mapa.dispose());
      grupo.removeFromParent();
    },
  };

  return api;
}
