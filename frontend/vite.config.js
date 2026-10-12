import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api calls are proxied to the FastAPI server on :8000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
