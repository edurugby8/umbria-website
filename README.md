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
  bosque/ajustes.js     LOS MANDOS: todos los números que se pueden tocar
  bosque/escena.js      el bosque 3D, la luz y el recorrido de cámara
  bosque/hojas-cerca.js la capa que roza la cara: cuelga de la cámara
  bosque/hoja-geometria.js  perfiles curvados: la hoja deja de ser un plano
  bosque/hoja-material.js   el sombreador que le da volumen y contraluz
  bosque/texturas.js    corteza, follaje, suelo, niebla, rayos, vegetación
  bosque/particulas.js  polen, luciérnagas y hojas, con su sombreador
  arte/paisaje.js       los paisajes de la galería, tarjetas y linterna
  ui/                   cursor, revelados, marquesina, linterna, contenido
  ui/panel.js           panel de ajustes; sólo se carga con `?ajustes`
pruebas.mjs             recorrido funcional
.github/workflows/      publicación en GitHub Pages
```

Las tipografías viven en `src/`, no en `public/`, a propósito: así Vite las
versiona con un resumen en el nombre y les pone la ruta base sola. En `public/`
va sólo lo que tiene que conservar su nombre exacto.


### Las cinco capas

Lo que da profundidad no es la distancia, es que haya **capas separadas por
niebla y por luz**, cada una moviéndose a su ritmo:

| # | Capa | Dónde vive | Qué aporta |
|---|------|-----------|------------|
| 0 | Hojas cercanas | **colgando de la cámara** | el roce en la cara |
| 1 | Sotobosque | 6–23 m de la senda | el suelo del bosque |
| 2 | Fronda media | 12–32 m | espesura: se abre y se cierra al pasar |
| 3 | Troncos y copas | hasta −172 m | el corredor por el que se avanza |
| 4 | Línea de árboles | a 150 m, viajando con la cámara | que el fondo no se corte en seco |

Entre todas va la niebla exponencial, que es la que las separa.

### De dónde sale el volumen de una hoja

Durante dos fases estas piezas fueron cuadriláteros de CUATRO vértices con
`MeshBasicMaterial`. Ese material, por definición, **no recibe luz**: su color
es la textura por una constante. Daba igual dónde estuviera el sol. Y cuatro
vértices no dan superficie donde pueda verse un degradado. Con esos dos
mimbres el volumen era imposible, y lo que se veía eran calcomanías.

Ahora cada pieza es una malla curvada de 20 a 48 vértices con su propio
sombreador (`hoja-geometria.js` y `hoja-material.js`). Cinco cosas la levantan:

1. **Geometría acucharada.** La sección se curva sobre el nervio, la punta se
   vence y hay un alabeo helicoidal. Sin eso no hay dónde poner la luz.
2. **Dos caras distintas.** La normal se voltea con `gl_FrontFacing`, así que
   el lado que mira al sol y el que está en sombra no se parecen.
3. **Transmisión.** Cuando el sol queda DETRÁS, el limbo deja pasar la luz.
   Es lo que hace que se lea como material vivo y no como papel.
4. **Halo del canto**, un `fresnel` mínimo y sólo a contraluz.
5. **Viento con torsión en el vértice**: la fuerza va con el cuadrado de la
   altura, así que la punta se mueve y la base se queda sujeta, y la hoja se
   retuerce sobre su nervio. La normal gira con ella.

Y el desenfoque por distancia dejó de ser tres copias horneadas de cada forma:
las texturas llevan mipmaps y el sombreador pide el nivel con un sesgo sacado
de la profundidad. Sale **continuo**, sin escalones, y ocupa un tercio de
memoria que las tres copias.

### Nueve formas, no una rotada

`haya · roble · acebo · avellano · castaño · grupo de tres · ramita · fronda ·
fragmento de rama`, cada una con dos semillas. Llevan agujeros de bicho,
mordiscos en el canto y los dos lados asimétricos. El acebo está porque lo
nombra el propio texto de la página.

Y no todas viajan: unas cuantas **asoman** desde un borde con la base fuera del
encuadre, se mecen y se retiran. Eso es lo que hacía falta para que la capa
pareciese parte de un árbol; una rama que nace fuera de cuadro cuenta que ahí
al lado hay un tronco.

### Cómo se consigue que una hoja roce la cara

Se cuelga **de la cámara**, no del bosque. Un follaje puesto en el mundo a medio
metro del objetivo se queda atrás en cuanto la cámara avanza; uno colgado de la
cámara viaja siempre con ella. Cada hoja entra por un lateral, cruza un trozo y
se va; el 78 % sólo roza el borde y vuelve a salir por donde entró, y el resto
cruza, pero siempre por arriba o por abajo, nunca por el centro, que es donde
vive el texto.

Tres detalles hacen que se lea como una hoja y no como una calcomanía:

- **Va a contraluz.** Lo que pasa DELANTE del objetivo tiene la luz detrás, así
  que se ve oscuro y desaturado. La primera versión iba de verde lima y parecía
  pegada al cristal.
- **El desenfoque viene horneado.** De cada forma hay tres copias con distinto
  difuminado, y cada hoja elige la suya según su profundidad. Cuesta cero por
  fotograma y no hace falta ningún paso de posprocesado.
- **Se coloca en proporción al encuadre**, no en metros: se calcula el medio
  ancho y el medio alto visibles a su profundidad y se sitúa ahí. Por eso en un
  móvil vertical siguen rozando los bordes en vez de salirse de cuadro.

### Los mandos

Todos los números ajustables están en `bosque/ajustes.js`, en un solo objeto.
Para probar otros valores sin recompilar, abre la página con `?ajustes`:

```
http://localhost:4300/umbria-website/?ajustes
```

Sale un panel con veinticinco deslizadores repartidos en cinco secciones
—cuánta vegetación, tamaño y distancia, movimiento, materia de la hoja, y luz y
aire— y cuatro **configuraciones comparables**: `Anterior` (cómo iba antes de
esta fase, para ver el cambio), `Natural` (**la publicada**), `Cinematográfica`
(menos piezas, más grandes, más desenfoque y contraluz) e `Intensa` (bosque
cerrado, mucha hoja y mucho viento). Cuando el ajuste esté bien, **Copiar
valores** deja el objeto listo para pegar en `ajustes.js`.

`AJUSTES` y la configuración `natural` tienen que coincidir clave por clave: la
pública es una sola.

El panel **no existe en la visita normal**: se carga con `import()` dinámico y
sólo si está el parámetro, así que ni siquiera entra en el paquete principal.

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
- **`alphaToCoverage` en toda la vegetación recortada.** `alphaTest` decide por
  píxel «dentro o fuera», sin término medio: de lejos no se nota, pero un
  helecho que pasa a metro y medio del objetivo se ve como una escalera de
  píxeles. Es, literalmente, el aspecto de videojuego antiguo.
  `alphaToCoverage` reparte esa decisión entre las muestras del multimuestreo y
  el canto sale suave sin ordenar transparencias ni pagar un pase extra.
- **La luz sube; el color de la hoja, no.** Los verdes vivos salen de iluminar
  el FONDO —el horizonte del cielo y la niebla— y de dejar que los rayos y las
  sombras hagan el contraste. Subir el color de la vegetación en sí es lo que
  convierte un hayedo en una moqueta de plástico. Hay un techo en la intensidad
  de la luz por esto mismo: pasado cierto punto lo único que se consigue es
  quemar los verdes claros.
- **Los rayos caen todos hacia el mismo lado que la luz clave.** Un rayo
  apuntando al revés de la sombra delata la escena al instante.
- **El difuso de la vegetación va ENVUELTO, no recortado.** Con
  `max(dot(N,L), 0)`, una hoja cuya normal mire a la cámara y un sol que venga
  de arriba dan cero: la hoja se apaga del todo. Y eso pasa casi siempre en la
  capa cercana, porque esas piezas miran al objetivo por definición. Llevar el
  producto escalar de [−1,1] a [0,1] antes de elevarlo reparte la luz alrededor
  del terminador, que es como se sombrea la vegetación desde siempre: una hoja
  es fina y translúcida, no una bola de billar.
- **Las piezas cercanas se ladean en las TRES dimensiones.** Si todas miran de
  frente, sus normales apuntan al mismo sitio, todas reciben la misma luz y
  vuelven a leerse como recortes. El ladeo es lo que hace que una coja el sol
  de plano y la de al lado se encienda por transmisión.
- **La vegetación cercana es MÁS OSCURA que la niebla del fondo.** Se lee por
  silueta contra la bruma. Una hoja más clara que el aire flota.
- **Ni un acento grave dentro de los literales de sombreador.** Uno solo,
  aunque esté dentro de un comentario de GLSL, cierra la cadena de JavaScript.
  Y la compilación falla de una forma que es fácil no ver si uno mira el final
  de la salida en vez del código de salida: se sirve el `dist` anterior y todo
  parece funcionar mientras se prueba una versión vieja. `npm run verificar`
  compila y prueba en un solo paso justamente por esto.

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
  cambian la resolución, el antialiasing y cuántos árboles, helechos, motas,
  jirones y hojas cercanas hay. En el nivel bajo la escena es la misma, con
  menos de todo.
- **Freno automático.** Adivinar la potencia por los núcleos y la memoria falla
  a menudo: un teléfono nuevo con la batería baja, un portátil con gráfica
  integrada. Así que además se MIDE: si el fotograma medio pasa de 34 ms
  durante dos segundos seguidos, baja un escalón de calidad —menos hojas,
  menos partículas—, y al segundo escalón baja también la resolución. Sólo
  baja, nunca sube: un sistema que sube y baja se nota mucho más que ir un
  escalón por debajo.
- **En vertical, menos hoja cercana.** El encuadre es estrecho y las mismas
  hojas se amontonan; se recortan a poco más de la mitad y de paso el teléfono
  respira.
- Las sombras proyectadas sólo se encienden en el nivel alto: son un pase extra
  sobre la geometría. Sin ellas la escena es la misma, sin el moteado del sol
  en el suelo.
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
  Las hojas cercanas siguen estando —repartidas por los bordes y quietas—, así
  que la composición no se queda coja: lo que se quita es el movimiento, no el
  bosque.
- **Las hojas no tapan el texto.** Cualquiera que se plante sobre el centro del
  cuadro se vuelve casi transparente, y el techo de opacidad hace que nunca
  lleguen a ser opacas. Pasar por delante del título, sí; taparlo, no.
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
en otra ruta, se pasa en `CHROMIUM`). Son veintisiete comprobaciones repartidas
en seis escenarios: escritorio, movimiento reducido, móvil, sin WebGL, capas de
profundidad y vegetación cercana. Cubren que la pantalla de carga se retire, que el contenido se
construya, que los revelados dejen el texto a la vista, que los lienzos se
pinten de verdad, que la linterna siga al puntero, que **la rueda no esté
secuestrada**, el control de movimiento, «Volver a entrar», que no haya
desbordamiento horizontal, el respaldo sin WebGL, que las hojas cercanas
cuelguen de la cámara y viajen de verdad, que **la pose no acumule estado**
(bajar a un punto y volver a él desde más abajo da la misma cámara) y que el
panel de ajustes no asome en la visita normal.

Se comprueba además que la hoja sea una malla curvada y no un plano, que lleve
sombreador propio, que todas compartan un único programa compilado, que el sol
llegue como dirección en espacio de cámara, que haya variedad de especies y
piezas ancladas al borde, que el desenfoque tenga muchos valores distintos —no
tres escalones— y que **nada se plante opaco sobre la zona del texto**.

Dos detalles de las pruebas que merece la pena conservar:

- Donde hay que esperar a que la escena se asiente, **se cuentan fotogramas
  pintados, no milisegundos**. Bajo renderizado por software un fotograma puede
  durar casi un segundo, y cualquier plazo fijo o bien se queda corto o bien da
  por buena una escena que ni siquiera ha vuelto a pintar. Una comprobación de
  los revelados fallaba una de cada cuatro veces por esto: no era frágil por
  casualidad, medía el tiempo equivocado.
- Donde se espera a que pase algo, se espera a **la condición**, no a un plazo.
  El desplazamiento suave de un anclaje tarda lo que tarde en fotogramas.

## Licencias

- **three.js** 0.160.1 — MIT.
- **GSAP** 3.12.5 y **ScrollTrigger** — licencia estándar de GreenSock, gratuita
  para este uso.
- **Fraunces** e **Inter Tight** — SIL Open Font License 1.1
  (`src/tipos/*-LICENSE.txt`).
- Todo lo demás —código, textos y las imágenes generadas— es original de esta
  pieza.

### Referencia

De los componentes de arranque de **claude-design**
(`Anthropic/claude-design/starter-components`, licencia **CC0 1.0 Universal**,
dominio público) se tomaron cuatro IDEAS, no código:

- `three-d-stage.js` — que la escena se piense por **capas de profundidad**, y
  que lo que las separa sea la luz y la niebla, no la distancia sola.
- `animations-v3.jsx` — que el scroll y el puntero no muevan las cosas
  directamente, sino que **empujen un valor que después se amortigua**. De ahí
  que acelerar no se note como un tirón.
- `image-slot.js` — que nada se coloque en unidades fijas, sino **en proporción
  al encuadre**. Es lo que hace que en un móvil vertical las hojas sigan
  rozando los bordes.
- `tweaks-panel.jsx` — un **panel para afinar en caliente** en vez de editar un
  número, recompilar y volver a mirar. El de aquí está reescrito en JavaScript
  a secas: aquél es React y esta pieza no lo lleva.

Se estudió, como referencia creativa y técnica, el proyecto público
[Taniiie/FloralFuture_Website](https://github.com/Taniiie/FloralFuture_Website):
su repertorio de recursos (cursor propio, marquesina, retícula de galería,
máscara de linterna, partículas con Three.js, revelados con GSAP) marcó el
listón de lo que la pieza tenía que resolver. **No se ha copiado nada suyo**: ni
texto, ni imágenes, ni código, ni identidad. El concepto, la marca, la paleta,
las tipografías, la escena 3D y todo el código de aquí están escritos de cero y
van por otro camino: donde la referencia es futurismo floral luminoso, esto es
un bosque en sombra, casi analógico.
