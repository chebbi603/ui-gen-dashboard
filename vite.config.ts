import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL;
  const wsBase = env.VITE_WS_URL || (apiBase ? apiBase.replace(/^http/, "ws") : undefined);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Proxy /api to backend to avoid CORS during local development
      proxy: apiBase
        ? {
            "/api": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            "/auth": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            "/users": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            "/contracts": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            "/events": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            "/ping": {
              target: apiBase,
              changeOrigin: true,
              secure: false,
            },
            // WebSocket proxy (if configured)
            ...(wsBase
              ? {
                  "/ws": {
                    target: wsBase,
                    ws: true,
                    changeOrigin: true,
                    secure: false,
                  },
                }
              : {}),
          }
        : undefined,
    }
  };
});
