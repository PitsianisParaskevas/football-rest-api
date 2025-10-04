import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@scripts": path.resolve(__dirname, "src/scripts"),
      "@services": path.resolve(__dirname, "src/services"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@data": path.resolve(__dirname, "src/data"),
    },
  },
   server: {
    port: 5173,
    proxy: {
      // Forward all backend API calls to Express (running on port 3000)
      "/tournaments": "http://localhost:3000",
      "/matches": "http://localhost:3000",
      "/teams": "http://localhost:3000",
      "/standings": "http://localhost:3000",
      // Add more as your backend expands
    },
  },
});
