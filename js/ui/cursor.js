/**
 * Cursor con halo.
 *
 * El punto sigue al ratón al instante y el halo va por detrás, amortiguado:
 * esa diferencia de velocidad es lo que da la sensación de luz que arrastra.
 * Sólo se monta en escritorio con puntero fino, y nunca sustituye al cursor
 * del sistema sobre texto o campos.
 */

export function montarCursor({ reducido }) {
  const nodo = document.getElementById('cursor');
  if (!nodo) return null;

  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fino || reducido) {
    nodo.remove();
    return null;
  }

  const halo = nodo.querySelector('.cursor__halo');
  const punto = nodo.querySelector('.cursor__punto');

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let hx = x;
  let hy = y;
  let raf = 0;

  const sensibles = 'a, button, .tarjeta, .pieza, .visor, input, select, textarea, [role="button"]';

  function alMover(e) {
    x = e.clientX;
    y = e.clientY;
    nodo.dataset.activo = 'si';
    const sobre = e.target?.closest?.(sensibles);
    if (sobre) nodo.dataset.sobre = 'si';
    else nodo.removeAttribute('data-sobre');
  }

  function bucle() {
    raf = requestAnimationFrame(bucle);
    hx += (x - hx) * 0.12;
    hy += (y - hy) * 0.12;
    halo.style.transform = `translate(${hx}px, ${hy}px) translate(-50%, -50%)`;
    punto.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }

  window.addEventListener('pointermove', alMover, { passive: true });
  document.addEventListener('pointerleave', () => nodo.removeAttribute('data-activo'));
  document.addEventListener('pointerdown', () => (nodo.dataset.pulsa = 'si'));
  document.addEventListener('pointerup', () => nodo.removeAttribute('data-pulsa'));
  raf = requestAnimationFrame(bucle);

  return {
    parar() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', alMover);
      nodo.remove();
    },
  };
}
