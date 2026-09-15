# UMBRÍA

Página inmersiva de una sola toma: un bosque en sombra que se atraviesa.
**Pieza de demostración de diseño de CodeCraft.**

> UMBRÍA no existe. Es una marca ficticia inventada para esta demostración. No
> hay tienda, formularios, seguimiento ni integraciones, y no se inventan
> testimonios, premios ni resultados de negocio.

Se abre en local sin instalar nada y **sin conexión**: las librerías, las
tipografías y todas las imágenes van dentro del proyecto o se generan en el
navegador.

```bash
python3 -m http.server 4300      # desde esta carpeta
# y abrir http://localhost:4300/
```

Hace falta servirla (aunque sea así) porque el JavaScript son módulos ES, y el
navegador no los carga desde `file://`.

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
niebla a la deriva y un balanceo mínimo de cámara, como el de alguien que
camina mirando alrededor.

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
index.html          estructura
estilo.css          todo el diseño
js/
  main.js           arranque y orquestación
  datos.js          textos, sendas y galería: el contenido, en un sitio
  lib/util.js       interpolación, curvas, medida del equipo
  bosque/escena.js  el bosque 3D y el recorrido de cámara
  bosque/texturas.js  árboles, helechos, niebla, rayos: dibujados en lienzo
  bosque/particulas.js  polen y luciérnagas, con su shader
  arte/paisaje.js   los paisajes de la galería, tarjetas y linterna
  ui/…              cursor, revelados, marquesina, linterna, contenido
vendor/             three.js y GSAP, alojados aquí
tipos/              las dos tipografías variables
```

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

## Licencias

- **three.js** 0.160.1 — MIT (`vendor/three-LICENSE.txt`).
- **GSAP** 3.12.5 y **ScrollTrigger** — licencia estándar de GreenSock, gratuita
  para este uso; la cabecera va dentro de los archivos.
- **Fraunces** e **Inter Tight** — SIL Open Font License 1.1
  (`tipos/*-LICENSE.txt`).
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
