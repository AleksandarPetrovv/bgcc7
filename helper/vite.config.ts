import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  // palette.css lives in the site, one folder up
  server: { port: 1420, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
});
