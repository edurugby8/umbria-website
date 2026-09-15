/**
 * Revelados con GSAP y ScrollTrigger.
 *
 * Regla que se respeta en toda la página: ScrollTrigger revela TEXTO y marca
 * la sección activa. No mueve la cámara ni secuestra la rueda. El recorrido
 * por el bosque lo lleva la escena, como función del desplazamiento, para que
 * bajar y subir recorran la misma curva.
 */

const { gsap } = window;

export function montarRevelados({ reducido, alCambiarSeccion }) {
  const raiz = document.documentElement;

  // Con movimiento reducido no hay recorrido: se retira el estado de partida
  // (que es lo que mantiene el texto escondido) y se deja todo a la vista.
  if (reducido || !gsap || !window.ScrollTrigger) {
    raiz.removeAttribute('data-anima');
    barraDeAvance(raiz);
    seccionActiva(alCambiarSeccion);
    return { refrescar() {}, entradaHero() {} };
  }

  gsap.registerPlugin(window.ScrollTrigger);
  gsap.defaults({ ease: 'power3.out' });
  /*
   * GSAP, por defecto, CONGELA su reloj cuando un fotograma tarda más de medio
   * segundo (lagSmoothing) para que las animaciones no peguen un salto. En un
   * equipo lento eso deja la entrada a medio camino indefinidamente. Aquí
   * interesa lo contrario: que el tiempo corra de reloj de pared y, si hay que
   * saltar, se salte.
   */
  gsap.ticker.lagSmoothing(0);

  const porDefecto = { start: 'top 82%', once: true };

  /** Un bloque de líneas recortadas sube a su sitio, escalonado. */
  function revelarLineas(nodo, retardo = 0) {
    const lineas = nodo.querySelectorAll('.linea__int');
    if (!lineas.length) return false;
    gsap.to(lineas, {
      y: '0%',
      duration: 1.15,
      stagger: 0.09,
      delay: retardo,
      scrollTrigger: { trigger: nodo, ...porDefecto },
    });
    return true;
  }

  /* El umbral NO se revela por desplazamiento: al cargar ya está en pantalla,
     y un disparador de scroll a la altura del pie del hero no llega a
     dispararse nunca. Va en su propia línea de tiempo, que arranca cuando se
     retira la pantalla de carga. */
  const enHero = (nodo) => !!nodo.closest('.umbral');

  document.querySelectorAll('.escena:not(.umbral) [data-revela], .manifiesto__texto [data-revela]').forEach((nodo) => {
    const retardo = Number(nodo.dataset.retardo || 0) * 0.09;
    if (revelarLineas(nodo, retardo)) return;
    gsap.to(nodo, {
      opacity: 1,
      y: 0,
      duration: 1,
      delay: retardo,
      scrollTrigger: { trigger: nodo, ...porDefecto },
    });
  });

  document.querySelectorAll('[data-aparece]').forEach((nodo) => {
    if (enHero(nodo)) return;
    gsap.to(nodo, {
      opacity: 1,
      y: 0,
      duration: 1.05,
      delay: Number(nodo.dataset.retardo || 0) * 0.11,
      scrollTrigger: { trigger: nodo, ...porDefecto },
    });
  });

  /** Tarjetas y piezas de galería: en cascada, no todas de golpe. */
  function cascada(selector, contenedor, opciones = {}) {
    const nodos = document.querySelectorAll(selector);
    if (!nodos.length) return;
    gsap.to(nodos, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.1,
      stagger: 0.12,
      ...opciones,
      scrollTrigger: { trigger: document.querySelector(contenedor) || nodos[0], start: 'top 78%', once: true },
    });
  }

  // Se construyen en JS, así que hay que esperar a que existan
  requestAnimationFrame(() => {
    cascada('.tarjeta', '#tarjetas');
    cascada('.pieza', '#galeria-rejilla');
    window.ScrollTrigger.refresh();
  });

  /* Paralaje suave de los titulares: suben un poco menos que la página, que
     es lo que separa el texto del fondo sin marear. */
  document.querySelectorAll('.escena .titular, .manifiesto__texto').forEach((nodo) => {
    gsap.to(nodo, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: nodo.closest('.escena') || nodo,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.6,
      },
    });
  });

  contadores();
  barraDeAvance(raiz);
  seccionActiva(alCambiarSeccion);

  /** Entrada del umbral: el texto sube mientras la niebla se abre. */
  let heroLanzado = false;
  function entradaHero() {
    if (heroLanzado) return;
    heroLanzado = true;
    const linea = gsap.timeline({ defaults: { ease: 'power3.out' } });
    linea
      .to('.umbral [data-revela] .linea__int', { y: '0%', duration: 1.35, stagger: 0.11 }, 0.1)
      .to(
        '.umbral [data-revela]:not(:has(.linea))',
        { opacity: 1, y: 0, duration: 1 },
        0.1,
      )
      .to(
        '.umbral [data-aparece]',
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.14 },
        0.55,
      );
  }

  return { refrescar: () => window.ScrollTrigger.refresh(), entradaHero };
}

/** Las cifras de la introducción cuentan hacia arriba al entrar en pantalla. */
function contadores() {
  document.querySelectorAll('.datos__num').forEach((nodo) => {
    const texto = nodo.textContent.trim();
    const casa = texto.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!casa) return;
    const [, antes, numero, despues] = casa;
    const destino = parseFloat(numero.replace(',', '.'));
    const decimales = (numero.split(/[.,]/)[1] || '').length;
    const estado = { v: 0 };
    nodo.textContent = `${antes}0${despues}`;
    gsap.to(estado, {
      v: destino,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: nodo, start: 'top 88%', once: true },
      onUpdate() {
        const v = estado.v.toFixed(decimales).replace('.', ',');
        nodo.textContent = `${antes}${v}${despues}`;
      },
    });
  });
}

/** Barra de avance de lectura. */
function barraDeAvance(raiz) {
  const actualizar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    raiz.style.setProperty('--avance', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
  };
  window.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  actualizar();
}

/** Marca en el menú la sección que ocupa la pantalla. */
function seccionActiva(alCambiar) {
  const secciones = [...document.querySelectorAll('.escena[id]')];
  if (!secciones.length) return;
  let ultima = '';

  const vigia = new IntersectionObserver(
    (entradas) => {
      const visibles = entradas
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visibles.length) return;
      const id = visibles[0].target.id;
      if (id === ultima) return;
      ultima = id;
      alCambiar?.(id);
    },
    { threshold: [0.25, 0.5, 0.75], rootMargin: '-20% 0px -30%' },
  );
  secciones.forEach((s) => vigia.observe(s));
}
