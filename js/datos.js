/**
 * Contenido de la página en un solo sitio.
 *
 * UMBRÍA es una marca ficticia creada para esta demostración. No hay
 * testimonios, premios ni resultados de negocio: lo que se cuenta es el sitio.
 */

export const MARQUESINA = [
  'Respira hondo',
  'Pisa blando',
  'La luz tarda en llegar abajo',
  'Habla bajo',
  'El musgo llevaba aquí primero',
  'No traigas nada',
];

export const SENDAS = [
  {
    num: '01',
    nombre: 'Amanecer en el hayedo',
    texto:
      'Se entra de noche cerrada y se llega al claro justo cuando la luz empieza a bajar entre las hayas. Es el momento en que la niebla se levanta del suelo.',
    meta: ['3 h', '4 km', 'Salida 06:20'],
    semilla: 11,
  },
  {
    num: '02',
    nombre: 'El sendero de los helechos',
    texto:
      'La parte más cerrada de la umbría, donde no se ve el cielo en un kilómetro. Se camina sobre musgo y el sonido cambia: el bosque absorbe las voces.',
    meta: ['2 h', '2,5 km', 'Todo el día'],
    semilla: 29,
  },
  {
    num: '03',
    nombre: 'Noche de luciérnagas',
    texto:
      'Sin linternas, sin teléfonos. Veinte minutos parados en silencio hasta que el ojo se acostumbra y el sotobosque se llena de puntos verdes.',
    meta: ['2 h', '1,8 km', 'Junio a agosto'],
    semilla: 47,
  },
];

export const GALERIA = [
  { hora: '05:40', nombre: 'Antes de la primera luz', clase: 'pieza--alta', semilla: 3, tono: 'noche' },
  { hora: '07:15', nombre: 'La niebla se levanta', clase: 'pieza--ancha', semilla: 17, tono: 'alba' },
  { hora: '09:30', nombre: 'Rayo sobre el helechal', clase: 'pieza--media', semilla: 23, tono: 'dia' },
  { hora: '12:00', nombre: 'Mediodía filtrado', clase: 'pieza--media', semilla: 31, tono: 'dia' },
  { hora: '18:45', nombre: 'La hora del ámbar', clase: 'pieza--media', semilla: 41, tono: 'ocaso' },
  { hora: '22:10', nombre: 'Sotobosque encendido', clase: 'pieza--media', semilla: 59, tono: 'noche' },
];
