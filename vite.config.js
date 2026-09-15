import { defineConfig } from 'vite';

/**
 * La base es `/umbria-website/` porque la página se publica en GitHub Pages
 * dentro de la ruta del repositorio, no en la raíz del dominio. Vite la
 * antepone a todo: al script del módulo, a la hoja de estilos, a las
 * tipografías y a lo que salga de `public/`.
 *
 * El servidor de desarrollo también sirve bajo esa ruta, así que lo que se ve
 * en local es exactamente lo que se publica. Si algún día la página pasa a un
 * dominio propio, esto vuelve a ser '/' y no hay que tocar nada más.
 */
export default defineConfig({
  base: '/umbria-website/',
  server: {
    port: 4300,
    host: true,
  },
  preview: {
    port: 4300,
    host: true,
  },
  build: {
    outDir: 'dist',
    // Las tipografías y el favicon se emiten como archivos, nunca en línea:
    // incrustar 80 kB de woff2 en el CSS retrasaría el primer pintado.
    assetsInlineLimit: 2048,
    sourcemap: false,
    rollupOptions: {
      output: {
        /**
         * three.js y GSAP en sus propios trozos. No es por el aviso de tamaño:
         * es que esas dos no cambian nunca y el código de la página sí, así que
         * separarlas deja que el navegador se quede con ellas en caché entre
         * versiones en lugar de volver a bajarlo todo.
         */
        manualChunks(ruta) {
          if (ruta.includes('node_modules/three')) return 'three';
          if (ruta.includes('node_modules/gsap')) return 'gsap';
          return null;
        },
      },
    },
  },
});
