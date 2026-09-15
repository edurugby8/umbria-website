/**
 * Polen y luciérnagas.
 *
 * Todo el movimiento va en el vértice, en la GPU: la CPU sólo actualiza un
 * uniforme de tiempo por fotograma. Mil motas cuestan lo mismo que una.
 *
 * El polen deriva hacia arriba en bucle y se balancea; las luciérnagas se
 * mueven más despacio, en tres ejes, y parpadean con una fase propia para que
 * no laten todas a la vez.
 */

import * as THREE from 'three';
const VERTEX = /* glsl */ `
  attribute float aFase;
  attribute float aEscala;
  attribute float aVel;
  attribute vec3 aDeriva;

  uniform float uTiempo;
  uniform float uDpr;
  uniform float uAlto;     // altura del bucle vertical
  uniform float uTamano;
  uniform float uParpadeo; // 0 = brillo fijo (polen), 1 = latido (luciérnagas)

  varying float vBrillo;
  varying float vGiro;

  void main() {
    vec3 p = position;

    // Deriva vertical en bucle: al salir por arriba reaparece por abajo
    p.y = mod(p.y + uTiempo * aVel, uAlto) - uAlto * 0.5;

    // Vaivén: cada mota lleva su propio eje y su propia frecuencia
    float t = uTiempo * 0.35 + aFase;
    p.x += sin(t * aDeriva.x) * aDeriva.z;
    p.z += cos(t * aDeriva.y) * aDeriva.z * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Tamaño con atenuación por distancia
    gl_PointSize = uTamano * aEscala * uDpr * (34.0 / max(0.1, -mv.z));

    // Se apagan de lejos, así la profundidad se lee sin niebla extra
    float lejania = smoothstep(120.0, 18.0, -mv.z);
    float latido = mix(1.0, 0.45 + 0.55 * sin(uTiempo * 1.9 + aFase * 6.283), uParpadeo);
    vBrillo = lejania * latido;
    // Las hojas voltean al caer; el polen no lo usa
    vGiro = uTiempo * (0.6 + aVel) + aFase * 6.283;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacidad;
  uniform sampler2D uMapa;
  varying float vBrillo;
  varying float vGiro;

  void main() {
    float a = texture2D(uMapa, gl_PointCoord).a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a * uOpacidad * vBrillo);
  }
`;

/**
 * @param {object} opciones
 * @param {number} opciones.cuantas
 * @param {THREE.Texture} opciones.mapa
 * @param {number[]} opciones.caja  [anchoX, altoY, fondoZ]
 * @param {number} opciones.color
 */
export function crearMotas({
  cuantas,
  mapa,
  caja = [60, 34, 120],
  color = 0xf0e6cc,
  tamano = 1,
  velocidad = [0.25, 0.9],
  deriva = 1.2,
  parpadeo = 0,
  opacidad = 0.75,
  gira = 0,
  mezcla = THREE.AdditiveBlending,
  cae = false,
}) {
  const [cx, cy, cz] = caja;
  const pos = new Float32Array(cuantas * 3);
  const fase = new Float32Array(cuantas);
  const escala = new Float32Array(cuantas);
  const vel = new Float32Array(cuantas);
  const der = new Float32Array(cuantas * 3);

  for (let i = 0; i < cuantas; i++) {
    pos[i * 3] = (Math.random() - 0.5) * cx;
    pos[i * 3 + 1] = Math.random() * cy;
    pos[i * 3 + 2] = -Math.random() * cz;
    fase[i] = Math.random();
    escala[i] = 0.45 + Math.random() * 1.1;
    vel[i] = (velocidad[0] + Math.random() * (velocidad[1] - velocidad[0])) * (cae ? -1 : 1);
    der[i * 3] = 0.5 + Math.random() * 1.6;
    der[i * 3 + 1] = 0.5 + Math.random() * 1.6;
    der[i * 3 + 2] = deriva * (0.4 + Math.random());
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  geo.setAttribute('aEscala', new THREE.BufferAttribute(escala, 1));
  geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 1));
  geo.setAttribute('aDeriva', new THREE.BufferAttribute(der, 3));
  // Las motas se mueven en el shader, así que la caja calculada al inicio no
  // vale: se desactiva el recorte por frustum en vez de recalcularla.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.max(cx, cy, cz));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uAlto: { value: cy },
      uTamano: { value: tamano },
      uParpadeo: { value: parpadeo },
      uGira: { value: gira },
      uColor: { value: new THREE.Color(color) },
      uOpacidad: { value: opacidad },
      uMapa: { value: mapa },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: mezcla,
  });

  const puntos = new THREE.Points(geo, material);
  puntos.frustumCulled = false;

  return {
    objeto: puntos,
    avanzar(t) {
      material.uniforms.uTiempo.value = t;
    },
    set opacidad(v) {
      material.uniforms.uOpacidad.value = v;
    },
    liberar() {
      geo.dispose();
      material.dispose();
    },
  };
}
