/**
 * Los mandos del bosque.
 *
 * Todo lo que se puede tocar vive AQUÍ, en un solo objeto de números. Ningún
 * otro archivo guarda una constante ajustable: la escena lee de este objeto en
 * cada fotograma, así que cambiar un valor y recargar —o moverlo en el panel—
 * se ve al instante y sin buscar por el código.
 *
 * Para probar otros valores: abre la página con `?ajustes`, mueve los
 * deslizadores o compara las cuatro configuraciones, pulsa «Copiar valores» y
 * pega el resultado sobre `AJUSTES`.
 */

export const AJUSTES = {
  /* ── Vegetación cercana: cuánta y de qué tipo ───────────────────── */
  hojas: 24,             // cuántas piezas viajan pegadas al objetivo
  proporcionHojas: 0.58, // 1 = sólo hojas sueltas · 0 = sólo grupos y ramas
  proporcionAsoman: 0.5, // cuántas cuelgan de un borde en vez de cruzar
  cruces: 0.16,          // qué parte cruza el encuadre de lado a lado

  /* ── Tamaño y distancia ─────────────────────────────────────────── */
  tamanoMin: 0.55,
  tamanoMax: 1.15,
  distanciaMin: 0.34,    // metros al objetivo: lo más cerca que llega nada
  distanciaMax: 2.4,     // y lo más lejos, ya integrado con el bosque

  /* ── Movimiento ─────────────────────────────────────────────────── */
  velocidadHojas: 0.92,
  viento: 1,             // balanceo propio de cada pieza
  torsion: 0.85,         // giro sobre el nervio: la punta se retuerce
  paralaje: 1,           // desplazamiento de la capa con el puntero
  reaccionPuntero: 0.7,  // cuánto se aparta una rama al acercar el cursor
  desenfoque: 1,         // arrastre en la dirección del movimiento

  /* ── Materia y luz de la hoja ───────────────────────────────────── */
  desenfoqueDistancia: 1, // sesgo de mipmap: el desenfoque por profundidad
  transmision: 1,         // luz que atraviesa el limbo a contraluz
  borde: 0.85,            // halo del canto encendido a contraluz
  saturacion: 0.8,        // por debajo de 1 = vegetación húmeda, no de plástico
  opacidadHojas: 0.9,     // techo de opacidad: nunca tapan del todo

  /* ── Recorrido y bosque de fondo ────────────────────────────────── */
  distanciaCamara: 1,
  movimientoCamara: 1,
  luz: 1.18,
  colorLuz: '#ffe7b4',
  niebla: 0.72,
  particulas: 1,
  brisa: 1,
};

/**
 * Configuraciones comparables.
 *
 * Sirven para ver de un vistazo qué cambia cada familia de valores, no para
 * dejar cuatro versiones publicadas: la pública es UNA, la que está arriba en
 * `AJUSTES`, que es «Natural».
 *
 *   · anterior       — cómo iba antes de esta fase, para comparar
 *   · natural        — la publicada: vegetación creíble, sin llamar la atención
 *   · cinematografica— menos piezas y más grandes, más desenfoque y contraluz
 *   · intensa        — bosque cerrado, mucha hoja y mucho viento
 */
export const CONFIGURACIONES = {
  anterior: {
    hojas: 24, proporcionHojas: 1, proporcionAsoman: 0, cruces: 0.22,
    tamanoMin: 0.5, tamanoMax: 1.4, distanciaMin: 0.42, distanciaMax: 2.3,
    velocidadHojas: 1, viento: 0, torsion: 0, paralaje: 1, reaccionPuntero: 0,
    desenfoque: 1, desenfoqueDistancia: 0.5, transmision: 0, borde: 0,
    saturacion: 1, opacidadHojas: 0.88,
  },
  natural: {
    hojas: 24, proporcionHojas: 0.58, proporcionAsoman: 0.5, cruces: 0.16,
    tamanoMin: 0.55, tamanoMax: 1.15, distanciaMin: 0.34, distanciaMax: 2.4,
    velocidadHojas: 0.92, viento: 1, torsion: 0.85, paralaje: 1,
    reaccionPuntero: 0.7, desenfoque: 1, desenfoqueDistancia: 1,
    transmision: 1, borde: 0.85, saturacion: 0.8, opacidadHojas: 0.9,
  },
  cinematografica: {
    hojas: 14, proporcionHojas: 0.4, proporcionAsoman: 0.8, cruces: 0.1,
    tamanoMin: 0.8, tamanoMax: 1.6, distanciaMin: 0.28, distanciaMax: 2.1,
    velocidadHojas: 0.7, viento: 0.8, torsion: 0.7, paralaje: 1.2,
    reaccionPuntero: 0.9, desenfoque: 1.4, desenfoqueDistancia: 1.5,
    transmision: 1.35, borde: 1.2, saturacion: 0.68, opacidadHojas: 0.95,
  },
  intensa: {
    hojas: 32, proporcionHojas: 0.5, proporcionAsoman: 0.45, cruces: 0.26,
    tamanoMin: 0.5, tamanoMax: 1.3, distanciaMin: 0.3, distanciaMax: 2.6,
    velocidadHojas: 1.25, viento: 1.6, torsion: 1.2, paralaje: 1.3,
    reaccionPuntero: 1, desenfoque: 1.2, desenfoqueDistancia: 1,
    transmision: 1.1, borde: 0.9, saturacion: 0.88, opacidadHojas: 0.95,
  },
};

/** Copia limpia, para el botón de restablecer del panel. */
export const AJUSTES_BASE = { ...AJUSTES };

/** Aplica un objeto de cambios sobre los ajustes vivos. */
export function ajustar(cambios) {
  Object.assign(AJUSTES, cambios);
  return AJUSTES;
}
