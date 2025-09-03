// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Send ONLY /api/sofa... to the proxy server on :4000
      "^/api/sofa": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },

      // Everything else under /api (but NOT /api/sofa) goes to your real backend on :3000
      "^/api(?!/sofa)": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
