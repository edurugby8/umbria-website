/**
 * El material de las hojas cercanas.
 *
 * Esto es lo que separa una hoja de una calcomanía. Antes iban con
 * `MeshBasicMaterial`, que —por definición— NO recibe luz: su color es la
 * textura por una constante. Daba igual dónde estuviese el sol; la hoja se
 * veía siempre igual. Aquí se hace lo contrario: la hoja se ilumina con la
 * MISMA luz clave del bosque y lo que se ve depende de hacia dónde mire.
 *
 * Cuatro cosas aportan el volumen:
 *
 *   1. DOS CARAS DISTINTAS. La normal se voltea según `gl_FrontFacing`, así
 *      que el lado que mira al sol y el que está en sombra no se parecen.
 *   2. TRANSMISIÓN. Cuando el sol queda DETRÁS de la hoja, el limbo deja
 *      pasar la luz: un verde o un ámbar muy suaves. Es lo que hace que se
 *      lea como material vivo y no como papel recortado.
 *   3. HALO DE BORDE. Un `fresnel` mínimo, y sólo donde la luz está detrás.
 *      Es la pelusa del canto encendida a contraluz.
 *   4. VIENTO CON TORSIÓN EN EL VÉRTICE. La deformación va con el cuadrado de
 *      la altura, así que la punta se mueve y la base se queda sujeta, y
 *      encima la hoja gira un poco sobre su nervio. La normal se corrige con
 *      la misma torsión, o el sombreado no acompañaría al movimiento.
 *
 * Y una quinta que no es volumen pero sí profundidad: el DESENFOQUE CONTINUO.
 * En vez de tres copias prehorneadas de cada forma, la textura lleva mipmaps y
 * el sombreador pide el nivel con `texture2D(mapa, uv, sesgo)`. El sesgo sale
 * de la profundidad de la hoja, así que el desenfoque varía de forma continua
 * —no a saltos—, cuesta cero por fotograma y encima gasta MENOS memoria que
 * las tres copias que había antes.
 *
 * Todas las piezas comparten este mismo código de sombreador. three compila el
 * programa una sola vez y lo reutiliza: son muchos materiales, pero un solo
 * programa en la tarjeta.
 */

import * as THREE from 'three';

/* OJO con los acentos graves dentro de estos literales: uno solo, aunque esté
   dentro de un comentario de GLSL, CIERRA la cadena de JavaScript y rompe la
   compilación. Aquí dentro, los nombres de función van sin comillas. */

const VERTEX = /* glsl */ `
  uniform float uTiempo;
  uniform float uViento;    // fuerza del balanceo
  uniform float uTorsion;   // giro sobre el nervio
  uniform float uFase;      // desfase propio: ninguna hoja late con otra
  uniform float uRitmo;     // cada hoja lleva su propia frecuencia

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vVista;

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec3 nor = normal;

    /* La base está sujeta a la rama y la punta no: la fuerza va con el
       CUADRADO de la altura. Si fuese lineal, la hoja entera se desplazaría
       y se vería como un objeto que flota, no como algo que cuelga. */
    float t = uv.y;
    float sujecion = t * t;

    float onda  = sin(uTiempo * (1.7 * uRitmo) + uFase);
    float onda2 = sin(uTiempo * (2.6 * uRitmo) + uFase * 1.63);

    // Balanceo
    pos.x += onda * sujecion * uViento * 0.22;
    pos.z += onda2 * sujecion * uViento * 0.15;

    /* Torsión sobre el nervio. Es el detalle que más se nota de cerca: una
       hoja al viento no se desplaza, se RETUERCE. Y la normal tiene que
       girar con ella, o el sombreado se quedaría quieto mientras la forma
       se mueve, que es de las cosas que más delatan un truco. */
    float ang = onda2 * sujecion * uTorsion * 0.6;
    float c = cos(ang);
    float s = sin(ang);
    pos.xz = mat2(c, -s, s, c) * pos.xz;
    nor.xz = mat2(c, -s, s, c) * nor.xz;

    // Inclinación añadida por el propio balanceo: la punta cae al doblarse
    nor.x -= onda * t * uViento * 0.35;
    nor = normalize(nor);

    vec4 enVista = modelViewMatrix * vec4(pos, 1.0);
    vVista = enVista.xyz;
    vNormal = normalize(normalMatrix * nor);
    gl_Position = projectionMatrix * enVista;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMapa;
  uniform vec3  uColor;
  uniform float uOpacidad;
  uniform float uSesgo;       // nivel de mipmap: el desenfoque por distancia
  uniform vec3  uLuzDir;      // dirección de la luz clave, en espacio de cámara
  uniform vec3  uLuzColor;
  uniform float uAmbiente;
  uniform float uTransmision; // cuánta luz atraviesa el limbo
  uniform float uBorde;       // halo del canto a contraluz
  uniform float uSaturacion;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vVista;

  void main() {
    // Desenfoque continuo: el sesgo empuja la lectura a un nivel más borroso
    vec4 tex = texture2D(uMapa, vUv, uSesgo);
    float alfa = tex.a * uOpacidad;
    if (alfa < 0.004) discard;

    // La hoja tiene dos caras y se ven desde las dos: la normal se voltea
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(-vVista);
    vec3 L = normalize(uLuzDir);

    vec3 base = uColor * tex.rgb;

    /* Difuso ENVUELTO, no el de toda la vida.
       Con max(dot(N,L), 0) una hoja cuya normal apunte a la cámara y un sol
       que venga de arriba dan cero: la hoja se apaga del todo y desaparece.
       Y es lo que pasa aquí casi siempre, porque estas piezas miran al
       objetivo por definición. El difuso envuelto —llevar el producto escalar
       de [−1,1] a [0,1] antes de elevarlo— reparte la luz alrededor del
       terminador, que es como se sombrea la vegetación desde siempre: una
       hoja es fina y translúcida, no una bola de billar. */
    float envuelto = dot(N, L) * 0.5 + 0.5;
    float frontal = envuelto * envuelto;

    /* Cara a contraluz: el sol está DETRÁS de esta cara, así que lo que se
       ve no es reflejo, es la luz ATRAVESANDO el limbo. Se tiñe hacia el
       verde y el ámbar porque eso es lo que filtra una hoja. */
    float trasera = max(dot(-N, L), 0.0);
    /* Lo que atraviesa el limbo.
       Dos veces me pasé aquí. Primero en fuerza: con el multiplicador alto la
       capa entera parecía cristal esmerilado. Y después en TEMPERATURA: al
       multiplicar por el color del sol —que es cálido— y hundir el azul, media
       vegetación se volvía naranja. Una hoja a contraluz se aclara HACIA EL
       VERDE; el ámbar aparece sólo en las que ya son de otoño. Así que el
       tinte va poco por encima del verde y el sol entra a medias. */
    float paso = pow(trasera, 1.7) * uTransmision * 0.32;
    vec3 filtrada = base * vec3(1.02, 1.26, 0.78);
    vec3 tinte = mix(vec3(1.0), uLuzColor, 0.45);

    /* Halo del canto, sólo a contraluz: la pelusa del borde encendida.
       Cuidado con esto: el fresnel vale 1 en TODA la superficie cuando la
       pieza se ve casi de canto, no sólo en el borde. Sin tope, una ramita
       ladeada se volvía blanca entera y parecía una pluma. Va con exponente
       alto y muy poca fuerza: tiene que insinuarse, no iluminar. */
    float fresnel = pow(1.0 - abs(dot(N, V)), 5.0);
    float halo = min(fresnel * trasera * uBorde * 0.35, 0.16);

    /* El difuso va corto a propósito. Esta vegetación está en la SOMBRA del
       primer plano, contra una niebla clara: tiene que leerse por silueta, no
       por brillo. Con el difuso suelto, una hoja de otoño puesta de canto se
       iba a un tono hueso y se veía como una astilla blanca. */
    vec3 color = base * (uAmbiente + frontal * 0.7)
               + filtrada * paso * tinte
               + tinte * halo;

    // Saturación: la vegetación cercana va desaturada a propósito. El verde
    // lima es lo que convierte un hayedo en un decorado de plástico.
    float gris = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gris), color, uSaturacion);

    gl_FragColor = vec4(color, alfa);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Un material de hoja. Se crea uno por pieza —cada una tiene su color, su
 * textura y su opacidad—, pero todos comparten el mismo código y por tanto el
 * mismo programa compilado.
 */
export function materialDeHoja() {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    // Van delante de todo: son la capa cero del recorrido
    depthTest: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMapa: { value: null },
      uColor: { value: new THREE.Color(0x3f5e3b) },
      uOpacidad: { value: 0 },
      uSesgo: { value: 0 },
      uTiempo: { value: 0 },
      uViento: { value: 1 },
      uTorsion: { value: 1 },
      uFase: { value: 0 },
      uRitmo: { value: 1 },
      uLuzDir: { value: new THREE.Vector3(-0.5, 0.7, 0.5) },
      uLuzColor: { value: new THREE.Color(0xffe7b4) },
      uAmbiente: { value: 0.3 },
      uTransmision: { value: 1 },
      uBorde: { value: 1 },
      uSaturacion: { value: 0.82 },
    },
  });
}
