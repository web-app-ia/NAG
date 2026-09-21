import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "treat-js-files-as-jsx",
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;
        // Use the default esbuild transform to treat .js as .jsx
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      "src": path.resolve(__dirname, "./src"),
      "components": path.resolve(__dirname, "./src/components"),
      "views": path.resolve(__dirname, "./src/views"),
      "layouts": path.resolve(__dirname, "./src/layouts"),
      "contexts": path.resolve(__dirname, "./src/contexts"),
      "assets": path.resolve(__dirname, "./src/assets"),
      "routes.js": path.resolve(__dirname, "./src/routes.js"),
      "net": path.resolve(__dirname, "./src/net"),
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    // Les librairies tierces sont volumineuses : on les separe en chunks
    // "vendor" pour un meilleur cache navigateur et un chargement initial reduit.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Le helper de prechargement injecte par Vite pour les import()
          // dynamiques. On le met dans son PROPRE chunk (pas "vendor"), sinon
          // il cree une dependance circulaire vendor -> react -> vendor et
          // "vl is not a function" au demarrage (React ne monte pas).
          // Dans son propre chunk il est charge au demarrage mais reste leger
          // (quelques octets), et three.js n'est plus force dans le preload.
          if (id.includes("preload-helper")) return "preloader";
          if (!id.includes("node_modules")) return;
          // Tout l'ecosysteme three + ses dependances dans UN SEUL chunk "three".
          // Cela evite tout cycle inter-chunks (three<->postprocessing ou vendor<->three
          // via une dep de drei qui importe three) qui provoque des crash TDZ au
          // demarrage ("Cannot access 'T'" / "useLayoutEffect undefined"). Ce chunk
          // n'importe que "vendor" (React), et "vendor" ne l'importe pas -> pas de cycle.
          // Liste etablie en greppant tous les packages de node_modules qui importent
          // "three" : three, @react-three/*, postprocessing, n8ao, maath, buffer,
          // three-stdlib, three-mesh-bvh, troika-three-text, troika-three-utils
          // (contiennent "three"), + camera-controls, meshline, stats-gl, @monogrid,
          // @react-spring (n'ont pas "three" dans leur nom -> catch-all "vendor" sinon).
          if (id.includes("three") || id.includes("@react-three") || id.includes("postprocessing") || id.includes("n8ao") || id.includes("maath") || id.includes("buffer") || id.includes("camera-controls") || id.includes("meshline") || id.includes("stats-gl") || id.includes("@monogrid") || id.includes("@react-spring")) return "three";
          if (id.includes("@mantine")) return "mantine";
          if (id.includes("bootstrap")) return "bootstrap";
          // chartist (Dashboard, charge au demarrage) et chart.js (vue Stat,
          // chargee a la demande) sont separes : chart.js n'est plus telecharge
          // au demarrage.
          if (id.includes("chart.js") || id.includes("react-chartjs")) return "chartjs";
          if (id.includes("chartist")) return "charts";
          if (id.includes("agora")) return "agora";
          // On NE split PAS React de "vendor". Si on met react/react-dom/
          // react-router dans leur propre chunk, react-router-dom importe
          // "history" (qui tombe dans vendor) => cycle vendor -> react -> vendor
          // et "Cannot access 'M' before initialization" au demarrage.
          // En gardant tout l'ecosysteme React dans le catch-all "vendor", il
          // n'y a plus qu'un seul chunk (pas de cycle possible) et React monte.
          return "vendor";
        },
      },
    },
  },
});
