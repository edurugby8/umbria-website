/**
 * Las hojas que rozan la cara.
 *
 * La capa más cercana del recorrido, y la única que NO vive en el bosque:
 * cuelga de la CÁMARA. Ése es todo el truco. Un follaje colocado en el mundo
 * a medio metro del objetivo se queda atrás en cuanto la cámara avanza; uno
 * colgado de la cámara viaja siempre con ella y cruza el encuadre a la
 * velocidad que uno quiera, que es exactamente lo que hace una rama cuando le
 * pasas por debajo.
 *
 * Tres ideas prestadas de las piezas de referencia (starter-components, CC0):
 *
 *   · de `three-d-stage`  — la escena se piensa por CAPAS de profundidad, y
 *     lo que las separa es la luz y la niebla, no la distancia sola.
 *   · de `image-slot`     — nada se coloca en unidades fijas: cada hoja se
 *     sitúa en PROPORCIÓN AL ENCUADRE. Por eso en un móvil vertical siguen
 *     rozando los bordes en vez de salirse de cuadro.
 *   · de `animations-v3`  — el scroll y el puntero no MUEVEN la hoja: le dan
 *     un empujón a un valor que después se amortigua. De ahí que acelerar no
 *     se note como un tirón.
 *
 * El desenfoque de las que pasan más cerca no es un posprocesado: cada forma
 * viene en tres copias con distinto difuminado ya horneado en la textura, y
 * cada hoja elige la suya según su profundidad. Cuesta cero por fotograma.
 */

import * as THREE from 'three';
import { clamp, damp, lerp, azarCon } from '../lib/util.js';

const GRADOS = Math.PI / 180;

/** Cuántas hojas soporta cada nivel de equipo, como tope del ajuste. */
export const TOPE_HOJAS = { alto: 34, medio: 20, bajo: 10 };

/**
 * @param {object} op
 * @param {THREE.PerspectiveCamera} op.camara
 * @param {Array} op.juego  salida de `juegoDeHojas()`
 * @param {object} op.caps  medida del equipo
 * @param {boolean} op.reducido
 * @param {object} op.ajustes  objeto AJUSTES vivo
 */
export function crearHojasCerca({ camara, juego, caps, reducido, ajustes }) {
  const grupo = new THREE.Group();
  grupo.renderOrder = 9;
  // Cuelga de la cámara: sus coordenadas SON coordenadas de cámara.
  camara.add(grupo);

  const geo = new THREE.PlaneGeometry(1, 1);
  const tope = TOPE_HOJAS[caps.nivel] || TOPE_HOJAS.medio;
  const azar = azarCon(90210);

  /* Paleta.
     La primera versión iba de verde lima y se leía como una calcomanía pegada
     al cristal. El error era de física, no de gusto: una hoja que pasa DELANTE
     del objetivo tiene la luz detrás, así que se ve A CONTRALUZ —oscura y
     desaturada—, no iluminada de frente. Los verdes van hondos, con dos o tres
     más claros (las que el sol atraviesa por el limbo) y algún tono de otoño.
     La variedad es lo que impide que parezcan estampadas con el mismo sello. */
  const PALETA = [
    0x3f5e3b, 0x2c4630, 0x4a6b41, 0x33502f, 0x5c7b46,
    0x7c8f4e, 0x8a7440, 0x263c29, 0x456540, 0x6f8a4a,
  ];

  const hojas = [];

  /** Medio encuadre a una profundidad dada. Aquí está la parte de image-slot. */
  function marco(z) {
    const mitadAlto = Math.tan((camara.fov / 2) * GRADOS) * z;
    return { h: mitadAlto, w: mitadAlto * camara.aspect };
  }

  /**
   * Reparte una hoja: de qué lado entra, por dónde va, a qué profundidad y a
   * qué velocidad. Se llama al crearla y cada vez que termina su viaje, así
   * que ninguna repite trayecto y no aparece patrón.
   */
  function repartir(hoja, primera = false) {
    const v = juego[Math.floor(azar() * juego.length)];

    // Profundidad: entre 0.42 m y 2.3 m del objetivo. Las de delante son las
    // que van desenfocadas; las de atrás, nítidas y más lentas.
    hoja.z = 0.42 + Math.pow(azar(), 1.5) * 1.9;
    const cercania = clamp((2.3 - hoja.z) / 1.88); // 1 = pegada al cristal

    // Textura según profundidad: el desenfoque va horneado, no calculado
    // La copia más difuminada es para MUY pocas: si la mitad del follaje va
    // desenfocado, lo que se ve son manchas, no hojas.
    hoja.malla.material.map = cercania > 0.88 ? v.suave : cercania > 0.62 ? v.media : v.nitida;
    hoja.malla.material.needsUpdate = true;

    hoja.lado = azar() > 0.5 ? 1 : -1;
    /* Dos maneras de cruzar el encuadre:
       · ROZAR (la mayoría) — entra por un lateral, se mete un trozo y se va
         por el mismo lado. La primera versión hacía que la que rozaba fuese
         de u=1,35 a u=1,70: los dos puntos FUERA de cuadro, así que no se
         veía ninguna. Ahora el recorrido es una curva que ENTRA y sale.
       · CRUZAR (una de cada cinco) — de lado a lado, y siempre por arriba o
         por abajo, nunca por el centro: ahí es donde vive el texto. */
    hoja.cruza = azar() < 0.22;
    hoja.fuera = 1.3 + azar() * 0.35;
    // Hasta dónde se mete la que roza: de asomar apenas a comerse medio cuadro
    hoja.dentro = 0.18 + Math.pow(azar(), 1.4) * 1.0;
    const altura = hoja.cruza ? (azar() > 0.5 ? 1 : -1) * (0.5 + azar() * 0.45) : (azar() - 0.5) * 1.9;
    hoja.v0 = altura + (azar() - 0.5) * 0.3;
    hoja.v1 = altura + (azar() - 0.5) * 0.8;
    // Arco: ninguna viaja en línea recta
    hoja.arco = (azar() - 0.5) * 0.7;
    hoja.serpentea = 0.5 + azar() * 1.6;

    /* Tamaño en proporción al encuadre, no en metros. Con esto también me
       pasé: una hoja tan alta como la pantalla no roza, TAPA. Lo que hace el
       efecto es que pase rápido y cerca, no que sea enorme. */
    hoja.escala = (0.10 + azar() * 0.24) * (0.62 + cercania * 0.66);
    hoja.giro0 = azar() * 6.283;
    hoja.giroVel = (azar() - 0.5) * 0.9;
    hoja.cabeceo = (azar() - 0.5) * 1.1;

    // Cuanto más cerca, más rápido pasa: es lo que da la sensación de roce
    hoja.vel = (0.055 + azar() * 0.075) * (0.55 + cercania * 1.35);
    hoja.p = primera ? azar() : 0;
    hoja.cercania = cercania;

    hoja.malla.material.color.setHex(PALETA[Math.floor(azar() * PALETA.length)]);
    // Cuanto más cerca, más apagada: está más fuera de foco y más a contraluz
    hoja.tono = 0.44 + (1 - cercania) * 0.36;
  }

  /* Puesto de CIERRE.
     Al arrancar, la entrada empieza con el follaje cerrado sobre el objetivo.
     La primera versión tiraba de todas hacia el mismo punto y se amontonaban
     en una esquina: no tapaban nada, sólo hacían un bulto. Ahora cada hoja
     tiene asignado de antemano un puesto sobre una rejilla repartida por todo
     el encuadre, con su pizca de azar para que la rejilla no se vea. */
  function puestoDeCierre(i, total) {
    const cols = Math.max(2, Math.round(Math.sqrt(total * 1.5)));
    const filas = Math.max(2, Math.ceil(total / cols));
    const cx = i % cols;
    const cy = Math.floor(i / cols) % filas;
    return {
      cu: ((cx + 0.5) / cols - 0.5) * 2.1 + (azar() - 0.5) * 0.5,
      cv: ((cy + 0.5) / filas - 0.5) * 2.1 + (azar() - 0.5) * 0.5,
      cgiro: azar() * 6.283,
    };
  }

  /**
   * Dónde está una hoja en su recorrido, en proporción al encuadre.
   * Se llama dos veces por fotograma —en `t` y un pelín después— porque de la
   * diferencia sale la dirección de viaje, que es la que orienta el arrastre.
   */
  function recorrido(h, t, brisa) {
    const u = h.cruza
      ? h.lado * (h.fuera - t * h.fuera * 2)
      // Entra, se mete `dentro` y vuelve a salir: una curva, no una recta
      : h.lado * (h.fuera - Math.sin(t * Math.PI) * (h.fuera + h.dentro));
    const v = lerp(h.v0, h.v1, t)
      + Math.sin(t * Math.PI) * h.arco
      + Math.sin(t * h.serpentea * 6.283 + h.giro0) * 0.07 * brisa;
    return { u, v };
  }

  function nacer() {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false, // van delante de todo: la capa cero del recorrido
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: true,
    });
    const malla = new THREE.Mesh(geo, mat);
    // Sin prueba de profundidad hay que fijar el orden: van por encima de todo
    // y entre ellas las ordena three de atrás hacia delante.
    malla.renderOrder = 20;
    // Pivote aparte: en él van el ángulo de viaje y el estirado por velocidad;
    // en la malla, la inclinación propia de la hoja. Separarlos es lo que
    // permite que el estirado se lea como arrastre y no deforme el dibujo.
    const pivote = new THREE.Object3D();
    pivote.add(malla);
    grupo.add(pivote);
    const hoja = { pivote, malla };
    repartir(hoja, true);
    Object.assign(hoja, puestoDeCierre(hojas.length, tope));
    hojas.push(hoja);
    return hoja;
  }

  for (let i = 0; i < tope; i++) nacer();

  let empuje = 0;      // lo que aporta el scroll y el puntero, amortiguado
  let cierreSuave = 0; // 1 = hojas cerradas sobre el objetivo (la entrada)

  const api = {
    objeto: grupo,

    /**
     * @param {number} dt  delta acotado, en segundos
     * @param {object} ctx { velScroll, punteroX, punteroY, cierre, luz, follaje, movimiento, reloj }
     */
    avanzar(dt, ctx) {
      // La espesura de la parada decide cuántas cruzan y con cuánto cuerpo
      const espesura = ctx.follaje ?? 1;
      /* En vertical el encuadre es estrecho y las mismas hojas se amontonan:
         la misma cantidad que en un portátil llena la pantalla de un móvil.
         Se recortan a poco más de la mitad, y de paso el teléfono respira. */
      const estrecho = camara.aspect < 1 ? 0.58 : 1;
      const cuantas = Math.min(
        tope,
        Math.max(0, Math.round(ajustes.hojas * clamp(espesura, 0, 2) * estrecho)),
      );
      const brisa = ajustes.brisa;
      const mov = ctx.movimiento;

      // El empujón: scroll y puntero suman, y se amortigua. Nunca se aplica
      // en crudo, o cada golpe de rueda daría un tirón.
      const deseo = clamp(ctx.velScroll, 0, 1.8) + Math.abs(ctx.punteroX) * 0.35;
      empuje = damp(empuje, deseo * mov, 3.2, dt);
      cierreSuave = damp(cierreSuave, ctx.cierre, 5, dt);

      const paso = dt * ajustes.velocidadHojas * (0.62 + empuje * 0.9) * mov;

      for (let i = 0; i < hojas.length; i++) {
        const h = hojas[i];
        if (i >= cuantas) {
          h.pivote.visible = false;
          continue;
        }
        h.pivote.visible = true;

        h.p += paso * h.vel * 6;
        if (h.p >= 1) repartir(h);

        const t = h.p;
        // Profundidad: al cerrarse la entrada, todas se echan encima del
        // cristal; al abrirse, vuelven a su sitio.
        const z = lerp(h.z, 0.34, cierreSuave * 0.85) * ajustes.distanciaCamara;
        const m = marco(z);

        // Recorrido en proporción al encuadre
        const aqui = recorrido(h, t, brisa);
        const luego = recorrido(h, Math.min(1, t + 0.02), brisa);
        let u = aqui.u;
        let v = aqui.v;

        // Durante la entrada ocupan su puesto en la rejilla —tapando el
        // encuadre entero— y desde ahí se apartan cada una por su lado.
        if (cierreSuave > 0.002) {
          u = lerp(u, h.cu, cierreSuave);
          v = lerp(v, h.cv, cierreSuave);
        }

        // El puntero las ladea un poco: la capa más cercana es la que más se
        // mueve, que es como funciona el paralaje de verdad.
        const desvio = ajustes.paralaje * (1.1 - h.cercania * 0.45);
        u -= ctx.punteroX * 0.16 * desvio;
        v += ctx.punteroY * 0.11 * desvio;

        h.pivote.position.set(u * m.w, v * m.h, -z);

        // Ángulo de viaje, medido del propio recorrido: así el arrastre va
        // siempre en la dirección real, también en las curvas.
        const angulo = Math.atan2((luego.v - aqui.v) * m.h, (luego.u - aqui.u) * m.w);
        h.pivote.rotation.z = angulo;

        // Arrastre: sólo en lo muy cercano y muy rápido, y con tope. Es el
        // «desenfoque de movimiento» que pedía el encargo, hecho con una
        // escala anisótropa en vez de con un paso de posprocesado.
        const arrastre = 1 + clamp((empuje * 0.3 + h.cercania * 0.24) * ajustes.desenfoque, 0, 0.2);
        // Cerradas son más grandes: es follaje pegado a la lente, no hojas
        const tam = h.escala * m.h * 2 * (1 + cierreSuave * 0.85);
        h.pivote.scale.set(tam * arrastre, tam, 1);

        // La hoja gira dentro de su pivote: cabeceo lento, como la que baja
        // dando vueltas sobre sí misma.
        h.malla.rotation.z = h.giro0 - angulo + Math.sin(ctx.reloj * 0.4 + h.giro0) * 0.25 * brisa;
        h.malla.rotation.y = Math.sin(ctx.reloj * 0.55 * h.giroVel + h.giro0) * h.cabeceo;

        // Aparece y desaparece en los extremos del viaje: nada da un salto
        const entra = clamp(t / 0.12);
        const sale = clamp((1 - t) / 0.14);
        let alfa = Math.min(entra, sale) * ajustes.opacidadHojas * h.tono;
        // Cerradas van opacas: la idea es que el visitante empiece DETRÁS de
        // ellas. Abiertas bajan, para no pelearse con el texto.
        alfa *= lerp(0.55, 1.55, cierreSuave) * clamp(espesura, 0, 1.2);

        /* Zona de respeto: si una hoja se planta sobre el centro del cuadro
           —que es donde vive el texto— se vuelve casi transparente. Pasar por
           delante del título, sí; taparlo, no. */
        if (cierreSuave < 0.25 && Math.abs(u) < 0.5 && Math.abs(v) < 0.34) {
          alfa *= lerp(0.38, 1, Math.max(Math.abs(u) / 0.5, Math.abs(v) / 0.34));
        }
        h.malla.material.opacity = clamp(alfa * (0.62 + ctx.luz * 0.3), 0, 1);
        h.malla.visible = h.malla.material.opacity > 0.01;
      }
    },

    /** Versión quieta para quien pide menos movimiento: sigue habiendo hojas,
     *  puestas en los bordes y sin viajar. */
    congelar() {
      hojas.forEach((h, i) => {
        const visible = i < Math.min(8, hojas.length);
        h.pivote.visible = visible;
        if (!visible) return;
        h.p = 0.28 + (i % 4) * 0.13;
        const m = marco(h.z);
        const { u, v } = recorrido(h, h.p, 0);
        h.pivote.position.set(u * m.w, v * m.h, -h.z);
        h.pivote.rotation.z = h.giro0;
        const tam = h.escala * m.h * 2;
        h.pivote.scale.set(tam, tam, 1);
        h.malla.material.opacity = 0.55 * ajustes.opacidadHojas * h.tono;
      });
    },

    liberar() {
      hojas.forEach((h) => h.malla.material.dispose());
      geo.dispose();
      juego.forEach((v) => {
        v.nitida.dispose();
        v.media.dispose();
        v.suave.dispose();
      });
      grupo.removeFromParent();
    },
  };

  return api;
}
