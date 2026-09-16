/**
 * La forma de una hoja cercana.
 *
 * Hasta ahora todas eran el mismo `PlaneGeometry(1, 1)`: cuatro vértices, una
 * superficie perfectamente plana. Con eso, por mucha luz que se le eche, no
 * hay volumen posible —no hay superficie donde pueda verse un degradado— y lo
 * que se ve es una calcomanía.
 *
 * Aquí se fabrican perfiles curvados. Son mallas diminutas (entre 15 y 48
 * vértices) y se comparten entre todas las piezas del mismo tipo, así que el
 * coste es el de una sola.
 *
 * Convenio: el tallo está en `uv.y = 0` (abajo) y la punta en `uv.y = 1`. Todo
 * el sistema —el viento, la torsión, la caída— cuenta con eso.
 */

import * as THREE from 'three';

/**
 * @param {object} p
 * @param {number} p.cuenco   cuánto se acuchara sobre el nervio (0 = plana)
 * @param {number} p.caida    cuánto se vence la punta hacia adelante
 * @param {number} p.arqueo   arqueo lateral: rompe la simetría izquierda/derecha
 * @param {number} p.alabeo   alabeo helicoidal, el de una hoja seca
 * @param {number} p.segU     divisiones a lo ancho
 * @param {number} p.segV     divisiones a lo largo
 */
export function geometriaHoja({
  cuenco = 0.16,
  caida = 0.12,
  arqueo = 0,
  alabeo = 0,
  segU = 4,
  segV = 6,
} = {}) {
  const geo = new THREE.PlaneGeometry(1, 1, segU, segV);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);        // −0.5 … 0.5 a lo ancho
    const t = uv.getY(i);         // 0 en el tallo, 1 en la punta
    let z = 0;

    /* Acucharado: la sección transversal de una hoja no es recta, se curva
       sobre el nervio central. Es lo que hace que un lado coja la luz y el
       otro no. Se atenúa cerca del tallo, donde la hoja está sujeta. */
    z += -cuenco * (x * x * 4 - 0.25) * (0.35 + t * 0.85);

    // Caída: la punta se vence hacia adelante, con el cuadrado de la altura
    z += caida * t * t;

    // Arqueo lateral: un lado tira más que el otro. Ninguna hoja es simétrica.
    z += arqueo * x * t;

    /* Alabeo helicoidal: la hoja se retuerce un poco sobre su eje según sube.
       Es lo que tiene una hoja que lleva tiempo al sol, y basta un pelín para
       que deje de leerse como un recorte. */
    if (alabeo) {
      const ang = alabeo * t * t;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const nx = x * c - z * s;
      z = x * s + z * c;
      pos.setX(i, nx);
    }
    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Los cinco perfiles, uno por tipo de pieza.
 *
 * Cada tipo se mueve distinto porque tiene forma distinta: una fronda de
 * helecho se vence mucho de punta, una ramita se arquea a lo largo del tallo
 * y apenas se acuchara, una rama es casi rígida.
 *
 * @param {'alto'|'medio'|'bajo'} nivel  malla más fina en equipos capaces
 */
export function perfiles(nivel = 'medio') {
  /* La malla es diminuta y se comparte entre todas las piezas del mismo tipo,
     así que apurar aquí no ahorra nada y sí se nota: con pocas divisiones el
     alabeo se pliega en facetas rectas y la hoja parece de papel doblado. */
  const fino = nivel === 'alto';
  const u = fino ? 5 : 4;
  const v = fino ? 8 : 6;

  return {
    // Hoja suelta: la más acucharada, la que mejor enseña las dos caras
    hoja: geometriaHoja({ cuenco: 0.2, caida: 0.14, arqueo: 0.05, alabeo: 0.22, segU: u, segV: v }),
    // Grupo de dos o tres: más ancho, menos cuenco, no se retuerce tanto
    grupo: geometriaHoja({ cuenco: 0.1, caida: 0.16, arqueo: 0.08, alabeo: 0.12, segU: u + 1, segV: v }),
    // Ramita: se arquea a lo largo, casi sin acuchararse
    ramita: geometriaHoja({ cuenco: 0.04, caida: 0.26, arqueo: 0.12, alabeo: 0.08, segU: u, segV: v + 1 }),
    // Fronda de helecho: la que más se vence de punta
    fronda: geometriaHoja({ cuenco: 0.07, caida: 0.34, arqueo: 0.06, alabeo: 0.1, segU: u, segV: v + 2 }),
    // Rama: grande y casi rígida, sólo un arco suave
    rama: geometriaHoja({ cuenco: 0.03, caida: 0.1, arqueo: 0.14, alabeo: 0.04, segU: u, segV: v }),
  };
}
