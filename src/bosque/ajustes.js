/**
 * Los mandos del bosque.
 *
 * Todo lo que se puede tocar del recorrido vive AQUÍ, en un solo objeto de
 * números. Ningún otro archivo guarda una constante ajustable: la escena lee
 * de este objeto en cada fotograma, así que cambiar un valor y recargar —o
 * moverlo en el panel— se ve al instante y sin buscar por el código.
 *
 * Estos valores son los que quedaron después de afinarlos con el panel
 * (`?ajustes` en la dirección). Para probar otros: abre la página con
 * `?ajustes`, mueve los deslizadores, pulsa «Copiar valores» y pega el
 * resultado sobre este objeto.
 */

export const AJUSTES = {
  /* ── Hojas cercanas (la capa que roza la cara) ──────────────────── */
  hojas: 24,          // cuántas viajan pegadas al objetivo (nivel alto)
  velocidadHojas: 1,  // 0.4 lento · 1 natural · 2 ventoso
  desenfoque: 1,      // cuánto se difumina lo que pasa a menos de un palmo
  opacidadHojas: 0.88,// techo de opacidad: nunca tapan del todo

  /* ── Profundidad ────────────────────────────────────────────────── */
  paralaje: 1,        // cuánto se desplazan las capas con puntero y scroll
  distanciaCamara: 1, // <1 acerca la cámara al follaje · >1 la echa atrás
  movimientoCamara: 1,// balanceo, respiración y ladeo del recorrido

  /* ── Luz y aire ─────────────────────────────────────────────────── */
  luz: 1.18,          // multiplica toda la iluminación y la exposición
  colorLuz: '#ffe7b4',// el sol que se cuela entre las copas
  niebla: 0.72,       // <1 despeja el fondo · >1 lo cierra
  particulas: 1,      // polen, motas de sol, luciérnagas y hojarasca
  brisa: 1,           // fuerza del viento sobre copas, helechos y hojas
};

/** Copia limpia, para el botón de restablecer del panel. */
export const AJUSTES_BASE = { ...AJUSTES };

/** Aplica un objeto de cambios sobre los ajustes vivos. */
export function ajustar(cambios) {
  Object.assign(AJUSTES, cambios);
  return AJUSTES;
}
