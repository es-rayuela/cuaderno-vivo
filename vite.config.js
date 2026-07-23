import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" hace que las rutas de los assets sean relativas, lo que funciona
// tanto en un dominio propio como en GitHub Pages (usuario.github.io/repo/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
