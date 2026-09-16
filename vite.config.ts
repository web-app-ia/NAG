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
});
