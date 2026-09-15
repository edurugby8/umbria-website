# UMBRÍA

Página inmersiva de una sola toma: un bosque en sombra que se atraviesa.
**Pieza de demostración de diseño de CodeCraft.**

> UMBRÍA no existe. Es una marca ficticia inventada para esta demostración. No
> hay tienda, formularios, seguimiento ni integraciones, y no se inventan
> testimonios, premios ni resultados de negocio.

**En marcha en dos órdenes:**

```bash
npm install
npm run dev
```

Y abrir la dirección que imprime la consola: **http://localhost:4300/umbria-website/**
(la ruta del final no es un capricho, ver *Ruta base* más abajo).

| Orden | Qué hace |
| --- | --- |
| `npm install` | Instala las dependencias (three.js, GSAP y Vite). |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila a `dist/`, listo para publicar. |
| `npm run preview` | Sirve `dist/` para revisar la compilación antes de subirla. |
| `npm run pruebas` | Recorrido funcional con Playwright (ver *Pruebas*). |

Hace falta Node 20 o superior.

### Ruta base

La página se publica en GitHub Pages **dentro de la ruta del repositorio**, no en
la raíz del dominio, así que `vite.config.js` fija `base: '/umbria-website/'`.
Vite la antepone a todo: al script, a la hoja de estilos, a las tipografías y a
lo que salga de `public/`. El servidor de desarrollo sirve bajo esa misma ruta,
de modo que lo que ves en local es exactamente lo que se publica.

Si algún día la página pasa a un dominio propio, se cambia esa línea a `'/'` y
no hay que tocar nada más.

### Publicar

`.github/workflows/pages.yml` compila y publica en cada empujón a `main`.

**Hace falta una cosa a mano, una sola vez:**

> *Settings* → *Pages* → *Source*: **GitHub Actions**

Hasta que se haga, el flujo falla en el paso *configure-pages* con un «Get Pages
site failed»: es literalmente que el repositorio todavía no tiene sitio de
Pages. No se puede automatizar —se intentó con `enablement: true` y la API
responde «Resource not accessible by integration», porque crear el sitio pide
permiso de administración que el token del flujo no tiene—.

Después de ese clic no hace falta volver a empujar: basta con *Actions* → la
ejecución fallida → **Re-run all jobs**.

Queda en **https://edurugby8.github.io/umbria-website/**.

---

## Dirección artística

**La idea.** *Umbría* es la cara de sombra de la montaña: la que no ve el sol de
frente y donde, justamente por eso, crece todo lo demás. Musgo, helecho, acebo.
La página no enseña un bosque: **te mete dentro y te hace avanzar por él**. Al
entrar, la niebla se aparta y la cámara empieza a caminar; a partir de ahí,
cada sección del documento es una parada de ese mismo paseo, sin cortes.

**El tono.** Cine, no escaparate. Poca luz, mucho aire, silencio. Contra la
tentación del bosque «mágico» de purpurina, aquí el brillo es escaso y caro: un
rayo que se cuela, unas luciérnagas, el oro de un rótulo. Lo demás es sombra.

En la escena hay, siempre: viento en la copa de los árboles y en los helechos,
polen en suspensión, hojas que caen volteando, rayos que se mecen, jirones de
niebla a la deriva —altos y posados en el suelo— y un balanceo mínimo de
cámara, como el de alguien que camina mirando alrededor.

**El arbolado es geometría, no recortes.** Cada tronco es un cilindro con
conicidad, inclinación propia y bultos de raíz, con su tono, y sólo la copa
sigue siendo un aspa de planos: es donde un recorte se disimula entre hoja y
niebla, mientras que el tronco es lo que cruza a un palmo del objetivo. El
suelo está subdividido y ondulado, con la senda llana para que no suba y baje
delante de la cámara.

**La luz no está para iluminar, está para dar forma.** Va deliberadamente baja:
subirla hasta ver bien el bosque destruye lo que hace que esto funcione, que es
que las cosas sean siluetas oscuras recortadas contra la niebla clara. Lo único
que aporta —y era lo que faltaba— es que un tronco tenga un lado y otro.

**Paleta.** Del suelo hacia la luz:

| | | |
| --- | --- | --- |
| `#070b09` | Noche | fondo, el negro no es negro: es verde muy apagado |
| `#0f1a14` · `#16271d` | Musgo, fronda | capas de vegetación y cristales |
| `#2f5740` · `#4d8460` | Savia, hoja | la vegetación cuando le da algo de luz |
| `#4a3a2a` · `#7a6449` | Corteza, barro | tierra, cinchas, madera |
| `#e8e0d0` · `#f7f2e6` | Crema, luz | toda la tipografía |
| `#d7b06a` · `#f0cd8c` | Oro | acento único: rótulos, cifras, el halo del cursor |

Los fondos se mantienen oscuros a propósito, para que la tipografía clara
aguante en todas las secciones y para que los halos aditivos de la escena 3D no
se laven.

**Tipografía.** Dos familias variables, alojadas en el proyecto:

- **Fraunces** para lo editorial (titulares, marca, manifiesto). Es una serif
  con ejes ópticos y un punto de rareza —los ejes `SOFT` y `WONK`— que la aleja
  del Playfair de manual: tiene carácter sin ponerse decorativa.
- **Inter Tight** para todo lo demás. Neutral, estrecha, aguanta bien los
  rótulos en mayúscula con mucho espaciado.

Las etiquetas van en Inter Tight, mayúsculas, `letter-spacing: .3em`. El
contraste entre esa retícula fría y la serif grande es la mitad del carácter de
la página.

**El recorrido.**

| # | Sección | Qué pasa en la escena |
| --- | --- | --- |
| 0 | Carga | La marca se dibuja letra a letra mientras se hornea el bosque. |
| 1 | Umbral | La niebla se aparta en dos y la cámara entra. Título y llamada. |
| — | Marquesina | Una franja de texto que cruza entre secciones. |
| 2 | Dónde estás | Texto editorial con capitular y tres cifras que cuentan solas. |
| 3 | Sendas | Tres tarjetas de cristal que se inclinan al pasar por encima. |
| 4 | De noche | La cámara baja, se apaga la luz y salen las luciérnagas. Se explora con una linterna. |
| 5 | Galería | Seis horas del mismo sitio. La cámara vuelve a subir. |
| 6 | Manifiesto | Cuatro líneas, alternando crema y oro. |
| 7 | El claro | Se abre la niebla, sube la exposición y se llega al final del corredor. |

---

## Cómo está montado

Sin framework y sin compilación. HTML, CSS y módulos ES.

```
index.html              punto de entrada (Vite parte de aquí)
vite.config.js          ruta base, servidores y reparto de trozos
public/                 lo que se copia tal cual: favicon y .nojekyll
src/
  main.js               arranque y orquestación
  datos.js              textos, sendas y galería: el contenido, en un sitio
  estilos/estilo.css    todo el diseño
  tipos/                las dos tipografías variables
  lib/util.js           interpolación, curvas, medida del equipo
  bosque/escena.js      el bosque 3D, la luz y el recorrido de cámara
  bosque/texturas.js    corteza, follaje, suelo, niebla, rayos: en lienzo
  bosque/particulas.js  polen, luciérnagas y hojas, con su sombreador
  arte/paisaje.js       los paisajes de la galería, tarjetas y linterna
  ui/                   cursor, revelados, marquesina, linterna, contenido
pruebas.mjs             recorrido funcional
.github/workflows/      publicación en GitHub Pages
```

Las tipografías viven en `src/`, no en `public/`, a propósito: así Vite las
versiona con un resumen en el nombre y les pone la ruta base sola. En `public/`
va sólo lo que tiene que conservar su nombre exacto.


### Las ideas que conviene no romper

- **La pose de la cámara es una función pura del desplazamiento**
  (`bosque/escena.js`). No hay estado acumulado: bajar y volver a subir
  recorren la misma curva, y recargar a media página aterriza donde debe.
- **ScrollTrigger revela texto; no mueve la cámara.** Mezclar las dos cosas es
  lo que produce esas páginas en las que, al subir, el producto va por un sitio
  y el texto por otro.
- **Nada de secuestrar la rueda.** Hubo aquí una amortiguación propia al estilo
  Lenis y se quitó: para suavizar la rueda hay que interceptarla con
  `preventDefault`, y en cuanto se hace eso la página deja de responder como el
  visitante espera —se queda atrás, se pelea con la barra y con el teclado, y
  según el navegador o el marco directamente no baja—. El recorrido ya va
  amortiguado donde importa, que es la cámara; la página se deja en paz. Los
  anclajes van suaves con `scroll-behavior`, que es cosa del navegador.
- **La pantalla de carga se retira con el primer fotograma del bosque**, no con
  un temporizador: dura lo que tiene que durar. Los temporizadores que quedan
  son sólo la red de seguridad.
- **Un solo lienzo 3D** detrás de todo el documento, sin capturar eventos.
- **El delta de tiempo se acota por los dos lados.** Un delta negativo —que sale
  de mezclar el sello de `requestAnimationFrame` con `performance.now()` en
  equipos lentos— convierte la interpolación exponencial en una exponencial
  creciente, y la escena se va de escala sin dar ningún error.
- **`gsap.ticker.lagSmoothing(0)`.** Por defecto GSAP congela su reloj cuando un
  fotograma tarda más de medio segundo. En un equipo lento eso deja la entrada a
  medio camino para siempre.
- **Nada de mipmaps en las texturas con `alphaTest`.** De lejos, el recorte del
  árbol se promedia, supera el umbral y se pinta el cuadrado entero: paneles
  pálidos flotando al fondo. Es el artefacto clásico.

### Imágenes

**No hay ni una fotografía.** Los seis cuadros de la galería, los fondos de las
tarjetas y las dos capas de la linterna se pintan en un lienzo 2D a partir de
una semilla (`arte/paisaje.js`): capas de siluetas cada vez más oscuras,
separadas por bandas de niebla, con sus rayos y su sotobosque. La misma semilla
da siempre el mismo bosque, así que la galería no baila entre visitas.

Los árboles, helechos, jirones de niebla y rayos de la escena 3D se dibujan
igual (`bosque/texturas.js`).

Aparte de no tener que resolver licencias de imagen, esto pesa menos que una
sola fotografía decente.

---

## Rendimiento

- Tres niveles de calidad según núcleos, memoria y densidad de pantalla:
  cambian la resolución, el antialiasing y cuántos árboles, helechos, motas y
  jirones hay. En el nivel bajo la escena es la misma, con menos de todo.
- El movimiento de las partículas y el **viento de la vegetación** van enteros
  en el vértice: la CPU sólo actualiza un uniforme de tiempo por fotograma, así
  que noventa árboles balanceándose cuestan lo mismo que uno quieto. El viento
  se inyecta en el material ya existente con `onBeforeCompile`, y la fuerza va
  con el cuadrado de la altura de la copa para que el pie del tronco no se
  despegue del suelo.
- Los lienzos de la galería y de la linterna se pintan **cuando se acercan**, no
  al arrancar.
- El bucle de render se detiene con la pestaña oculta.

## Accesibilidad

- `prefers-reduced-motion`: sin entrada animada, sin revelados, sin paseo de la
  linterna, sin marquesina en marcha y sin desplazamiento amortiguado. **Todo el
  contenido queda visible** y la escena adopta su composición sin recorrido.
- Control para pausar el movimiento, con la preferencia recordada. Si el sistema
  ya pide menos movimiento, el control lo explica en vez de ofrecer una acción
  vacía.
- Enlace para saltar al contenido, foco visible en toda la interfaz y navegación
  por teclado.
- El cursor con halo es sólo de escritorio con puntero fino, no captura eventos
  y nunca sustituye al del sistema.
- Si no hay WebGL se pinta el bosque en CSS y el resto de la página funciona
  igual.

## Pruebas

Con la compilación servida en otra terminal:

```bash
npm run build && npm run preview     # en una terminal
npm run pruebas                      # en otra
```

Necesita Playwright (`npx playwright install chromium`; si el navegador ya está
en otra ruta, se pasa en `CHROMIUM`). Son veinte comprobaciones repartidas en
cuatro escenarios: escritorio, movimiento reducido, móvil y sin WebGL. Cubren
que la pantalla de carga se retire, que el contenido se construya, que los
revelados dejen el texto a la vista, que los lienzos se pinten de verdad, que la
linterna siga al puntero, que **la rueda no esté secuestrada**, el control de
movimiento, «Volver a entrar», que no haya desbordamiento horizontal y el
respaldo sin WebGL.

## Licencias

- **three.js** 0.160.1 — MIT.
- **GSAP** 3.12.5 y **ScrollTrigger** — licencia estándar de GreenSock, gratuita
  para este uso.
- **Fraunces** e **Inter Tight** — SIL Open Font License 1.1
  (`src/tipos/*-LICENSE.txt`).
- Todo lo demás —código, textos y las imágenes generadas— es original de esta
  pieza.

### Referencia

Se estudió, como referencia creativa y técnica, el proyecto público
[Taniiie/FloralFuture_Website](https://github.com/Taniiie/FloralFuture_Website):
su repertorio de recursos (cursor propio, marquesina, retícula de galería,
máscara de linterna, partículas con Three.js, revelados con GSAP) marcó el
listón de lo que la pieza tenía que resolver. **No se ha copiado nada suyo**: ni
texto, ni imágenes, ni código, ni identidad. El concepto, la marca, la paleta,
las tipografías, la escena 3D y todo el código de aquí están escritos de cero y
van por otro camino: donde la referencia es futurismo floral luminoso, esto es
un bosque en sombra, casi analógico.
