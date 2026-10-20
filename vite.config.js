import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// /api é repassado para a API, igual ao vercel.json em produção:
// o cookie de sessão fica no mesmo domínio do site
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = (env.VITE_API_URL || "https://buddylog-rosy.vercel.app").replace(/\/$/, "");

  return {
    plugins: [react()],
    base: "./",
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
