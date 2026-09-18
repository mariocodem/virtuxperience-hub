import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  // WebXR (cámara AR, hit-test) y getUserMedia solo funcionan en un "secure
  // context": HTTPS, o "localhost". Al abrir la app desde el celular por la
  // IP de la red local, sin este plugin el navegador bloquea navigator.xr
  // por completo y la app cae siempre al modo escritorio sin cámara.
  plugins: [basicSsl()],
  server: {
    host: true,
  },
});
