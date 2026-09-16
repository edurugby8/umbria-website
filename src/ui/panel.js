/**
 * Panel de ajustes.
 *
 * Adaptación en JavaScript sencillo de la idea de `tweaks-panel.jsx`
 * (starter-components, CC0): un panel flotante de cristal, agrupado por
 * secciones, con deslizadores que muestran su valor. No se copia el código
 * —aquél es React y este proyecto no lo lleva—, se copia el CONCEPTO: afinar
 * en caliente, viendo el resultado, en vez de editar un número, recompilar y
 * volver a mirar.
 *
 * NO va en la versión pública. Sólo se carga si la dirección lleva `?ajustes`,
 * y el import es dinámico, así que ni siquiera entra en el paquete principal.
 * Cuando los valores están bien: «Copiar valores» y pegar en `ajustes.js`.
 */

import { AJUSTES, AJUSTES_BASE } from '../bosque/ajustes.js';

const CSS = `
.pnl{position:fixed;right:14px;bottom:14px;z-index:9000;width:266px;
  max-height:calc(100dvh - 28px);display:flex;flex-direction:column;
  background:rgba(14,26,19,.82);color:#e8e0d0;
  -webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%);
  border:1px solid rgba(215,176,106,.3);border-radius:14px;
  box-shadow:0 18px 50px rgba(0,0,0,.5);
  font:11.5px/1.45 var(--sans,system-ui,sans-serif);overflow:hidden}
.pnl[data-plegado] .pnl__cuerpo,.pnl[data-plegado] .pnl__pie{display:none}
.pnl__cab{display:flex;align-items:center;justify-content:space-between;
  padding:9px 8px 9px 13px;user-select:none;border-bottom:1px solid rgba(255,255,255,.08)}
.pnl__cab b{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#d7b06a}
.pnl__x{appearance:none;border:0;background:transparent;color:rgba(232,224,208,.6);
  width:24px;height:24px;border-radius:7px;cursor:pointer;font-size:14px;line-height:1}
.pnl__x:hover{background:rgba(255,255,255,.1);color:#fff}
.pnl__cuerpo{padding:4px 13px 12px;display:flex;flex-direction:column;gap:9px;
  overflow-y:auto;min-height:0;scrollbar-width:thin}
.pnl__sec{font-size:9.5px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;
  color:rgba(215,176,106,.7);padding:9px 0 0}
.pnl__sec:first-child{padding-top:2px}
.pnl__fila{display:flex;flex-direction:column;gap:3px}
.pnl__et{display:flex;justify-content:space-between;align-items:baseline;gap:8px;
  color:rgba(232,224,208,.8)}
.pnl__val{color:rgba(215,176,106,.85);font-variant-numeric:tabular-nums;font-size:10.5px}
.pnl input[type=range]{appearance:none;-webkit-appearance:none;width:100%;height:3px;margin:4px 0;
  border-radius:99px;background:rgba(255,255,255,.16);outline:none;cursor:pointer}
.pnl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
  width:13px;height:13px;border-radius:50%;background:#e8e0d0;border:0;
  box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:pointer}
.pnl input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;
  background:#e8e0d0;border:0;box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:pointer}
.pnl input[type=range]:focus-visible{outline:2px solid #d7b06a;outline-offset:3px}
.pnl__colores{display:flex;gap:6px;padding-top:2px}
.pnl__color{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.18);
  cursor:pointer;padding:0}
.pnl__color[aria-pressed=true]{outline:2px solid #d7b06a;outline-offset:2px}
.pnl__pie{display:flex;gap:6px;padding:10px 13px 12px;border-top:1px solid rgba(255,255,255,.08)}
.pnl__pie button{flex:1;appearance:none;border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:10.5px;
  padding:7px 6px;border-radius:8px;cursor:pointer}
.pnl__pie button:hover{background:rgba(255,255,255,.14)}
@media (max-width:640px){.pnl{left:14px;right:14px;width:auto}}
`;

const SOLES = [
  ['#ffe7b4', 'Mañana'],
  ['#fff4dd', 'Mediodía'],
  ['#ffd79a', 'Tarde'],
  ['#cfe6d8', 'Nublado'],
];

/**
 * @param {object} bosque  el objeto que devuelve `montarBosque`
 */
export function montarPanel(bosque) {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const panel = document.createElement('aside');
  panel.className = 'pnl';
  panel.setAttribute('aria-label', 'Ajustes del bosque');
  panel.innerHTML = `
    <div class="pnl__cab"><b>Ajustes</b>
      <button class="pnl__x" type="button" title="Plegar" aria-label="Plegar panel">—</button></div>
    <div class="pnl__cuerpo"></div>
    <div class="pnl__pie">
      <button type="button" data-copiar>Copiar valores</button>
      <button type="button" data-reiniciar>Restablecer</button>
    </div>`;
  const cuerpo = panel.querySelector('.pnl__cuerpo');

  const seccion = (texto) => {
    const h = document.createElement('div');
    h.className = 'pnl__sec';
    h.textContent = texto;
    cuerpo.appendChild(h);
  };

  /** Un deslizador atado directamente a una clave de AJUSTES. */
  const desliz = (clave, etiqueta, min, max, paso, formato = (v) => v.toFixed(2)) => {
    const fila = document.createElement('div');
    fila.className = 'pnl__fila';
    const id = `pnl-${clave}`;
    fila.innerHTML = `<label class="pnl__et" for="${id}"><span>${etiqueta}</span>
      <span class="pnl__val"></span></label>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${paso}">`;
    const input = fila.querySelector('input');
    const val = fila.querySelector('.pnl__val');
    const pintar = () => {
      input.value = String(AJUSTES[clave]);
      val.textContent = formato(Number(AJUSTES[clave]));
    };
    input.addEventListener('input', () => {
      AJUSTES[clave] = Number(input.value);
      val.textContent = formato(Number(input.value));
    });
    pintar();
    fila.__pintar = pintar;
    cuerpo.appendChild(fila);
    return fila;
  };

  const entero = (v) => String(Math.round(v));

  seccion('Hojas cercanas');
  const filaHojas = desliz('hojas', 'Cuántas', 0, bosque?.topeHojas ?? 34, 1, entero);
  desliz('velocidadHojas', 'Velocidad', 0.2, 2.5, 0.05);
  desliz('desenfoque', 'Desenfoque', 0, 2, 0.05);
  desliz('opacidadHojas', 'Presencia', 0.2, 1, 0.02);

  seccion('Profundidad');
  desliz('paralaje', 'Paralaje', 0, 2, 0.05);
  desliz('distanciaCamara', 'Distancia de cámara', 0.6, 1.6, 0.02);
  desliz('movimientoCamara', 'Movimiento de cámara', 0, 2, 0.05);

  seccion('Luz y aire');
  desliz('luz', 'Intensidad de luz', 0.5, 2, 0.02);

  const colores = document.createElement('div');
  colores.className = 'pnl__fila';
  colores.innerHTML = '<span class="pnl__et"><span>Color de la luz</span></span>';
  const tira = document.createElement('div');
  tira.className = 'pnl__colores';
  SOLES.forEach(([hex, nombre]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pnl__color';
    b.style.background = hex;
    b.title = nombre;
    b.setAttribute('aria-label', `Luz: ${nombre}`);
    b.addEventListener('click', () => {
      AJUSTES.colorLuz = hex;
      pintarColores();
    });
    tira.appendChild(b);
  });
  colores.appendChild(tira);
  cuerpo.appendChild(colores);
  const pintarColores = () => {
    [...tira.children].forEach((b, i) => {
      b.setAttribute('aria-pressed', String(SOLES[i][0] === AJUSTES.colorLuz));
    });
  };
  pintarColores();

  desliz('niebla', 'Niebla', 0, 2.5, 0.02);
  desliz('particulas', 'Partículas', 0, 2, 0.05);
  desliz('brisa', 'Brisa', 0, 2.5, 0.05);

  const repintar = () => {
    cuerpo.querySelectorAll('.pnl__fila').forEach((f) => f.__pintar?.());
    pintarColores();
  };

  panel.querySelector('[data-copiar]').addEventListener('click', async (e) => {
    const texto = `export const AJUSTES = ${JSON.stringify(AJUSTES, null, 2)};`;
    try {
      await navigator.clipboard.writeText(texto);
      e.target.textContent = '¡Copiado!';
    } catch {
      console.log(texto);
      e.target.textContent = 'En la consola';
    }
    setTimeout(() => { e.target.textContent = 'Copiar valores'; }, 1600);
  });

  panel.querySelector('[data-reiniciar]').addEventListener('click', () => {
    Object.assign(AJUSTES, AJUSTES_BASE);
    repintar();
  });

  panel.querySelector('.pnl__x').addEventListener('click', () => {
    panel.toggleAttribute('data-plegado');
  });

  document.body.appendChild(panel);
  // El tope de hojas depende del equipo, y el equipo se mide al arrancar
  filaHojas.querySelector('input').max = String(bosque?.topeHojas ?? 34);

  return { panel, repintar, quitar: () => { panel.remove(); estilo.remove(); } };
}
