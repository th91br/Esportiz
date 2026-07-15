// vite.config.ts
import { defineConfig } from "file:///C:/Users/Thiago/Esportiz/esportiz/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Thiago/Esportiz/esportiz/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { VitePWA } from "file:///C:/Users/Thiago/Esportiz/esportiz/node_modules/vite-plugin-pwa/dist/index.js";

// src/build/manualChunks.ts
var manualChunkRules = [
  {
    chunkName: "vendor-react",
    packages: ["react", "react-dom", "scheduler", "use-sync-external-store"]
  },
  {
    chunkName: "vendor-router",
    packages: ["react-router", "react-router-dom", "@remix-run/router"]
  },
  {
    chunkName: "vendor-query",
    packages: ["@tanstack/react-query"]
  },
  {
    chunkName: "vendor-supabase",
    packages: ["@supabase"]
  },
  {
    chunkName: "vendor-charts",
    packages: [
      "recharts",
      "recharts-scale",
      "d3-",
      "victory-vendor",
      "decimal.js-light",
      "internmap",
      "lodash",
      "react-is"
    ]
  },
  {
    chunkName: "vendor-icons",
    packages: ["lucide-react"]
  },
  {
    chunkName: "vendor-ui",
    packages: [
      "@radix-ui",
      "cmdk",
      "embla-carousel-react",
      "input-otp",
      "next-themes",
      "react-day-picker",
      "sonner",
      "tailwind-merge",
      "vaul"
    ]
  },
  {
    chunkName: "vendor-date",
    packages: ["date-fns"]
  },
  {
    chunkName: "vendor-analytics",
    packages: ["@vercel/analytics", "web-vitals"]
  },
  {
    chunkName: "vendor-forms",
    packages: ["@hookform", "react-hook-form", "zod"]
  }
];
function normalizeModuleId(id) {
  return id.replace(/\\/g, "/");
}
function packageMatcher(packageName) {
  if (packageName.endsWith("-")) {
    return `/node_modules/${packageName}`;
  }
  return `/node_modules/${packageName}/`;
}
function getManualChunk(id) {
  const normalizedId = normalizeModuleId(id);
  if (normalizedId.includes("commonjsHelpers") || normalizedId.includes("vite/preload-helper")) {
    return "vendor-react";
  }
  if (!normalizedId.includes("/node_modules/")) {
    return void 0;
  }
  const matchingRule = manualChunkRules.find((rule) => rule.packages.some((packageName) => normalizedId.includes(packageMatcher(packageName))));
  return matchingRule?.chunkName ?? "vendor-misc";
}

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\Thiago\\Esportiz\\esportiz";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: "auto",
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192x192.png", "icon-512x512.png"],
      manifest: {
        id: "com.esportiz.app",
        name: "Esportiz",
        short_name: "Esportiz",
        description: "Gest\xE3o que joga junto. Plataforma completa para escolas esportivas.",
        theme_color: "#0D1F3C",
        background_color: "#0D1F3C",
        display: "standalone",
        orientation: "portrait",
        start_url: "/dashboard",
        categories: ["business", "sports", "productivity"],
        lang: "pt-BR",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/screens/dashboard.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Dashboard de Gest\xE3o Inteligente"
          },
          {
            src: "/screens/alunos_real.png",
            sizes: "1280x720",
            type: "image/png",
            label: "Gest\xE3o de Alunos e Matr\xEDculas"
          }
        ],
        shortcuts: [
          {
            name: "Calend\xE1rio de Treinos",
            short_name: "Calend\xE1rio",
            description: "Ver treinos agendados para hoje",
            url: "/calendario",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Gest\xE3o de Alunos",
            short_name: "Alunos",
            description: "Lista de alunos e matr\xEDculas",
            url: "/alunos",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Financeiro",
            short_name: "Financeiro",
            description: "Controle de pagamentos e mensalidades",
            url: "/pagamentos",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/$/]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL2J1aWxkL21hbnVhbENodW5rcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFRoaWFnb1xcXFxFc3BvcnRpelxcXFxlc3BvcnRpelwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcVGhpYWdvXFxcXEVzcG9ydGl6XFxcXGVzcG9ydGl6XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9UaGlhZ28vRXNwb3J0aXovZXNwb3J0aXovdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSBcInZpdGUtcGx1Z2luLXB3YVwiO1xyXG5pbXBvcnQgeyBnZXRNYW51YWxDaHVuayB9IGZyb20gXCIuL3NyYy9idWlsZC9tYW51YWxDaHVua3NcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgaW5qZWN0UmVnaXN0ZXI6ICdhdXRvJyxcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdpY29uLTE5MngxOTIucG5nJywgJ2ljb24tNTEyeDUxMi5wbmcnXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBpZDogJ2NvbS5lc3BvcnRpei5hcHAnLFxyXG4gICAgICAgIG5hbWU6ICdFc3BvcnRpeicsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogJ0VzcG9ydGl6JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0dlc3RcdTAwRTNvIHF1ZSBqb2dhIGp1bnRvLiBQbGF0YWZvcm1hIGNvbXBsZXRhIHBhcmEgZXNjb2xhcyBlc3BvcnRpdmFzLicsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMEQxRjNDJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzBEMUYzQycsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy9kYXNoYm9hcmQnLFxyXG4gICAgICAgIGNhdGVnb3JpZXM6IFsnYnVzaW5lc3MnLCAnc3BvcnRzJywgJ3Byb2R1Y3Rpdml0eSddLFxyXG4gICAgICAgIGxhbmc6ICdwdC1CUicsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnL2ljb24tMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9pY29uLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnknXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcvbWFza2FibGUtaWNvbi01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBzY3JlZW5zaG90czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcvc2NyZWVucy9kYXNoYm9hcmQucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICcxOTIweDEwODAnLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgZm9ybV9mYWN0b3I6ICd3aWRlJyxcclxuICAgICAgICAgICAgbGFiZWw6ICdEYXNoYm9hcmQgZGUgR2VzdFx1MDBFM28gSW50ZWxpZ2VudGUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICcvc2NyZWVucy9hbHVub3NfcmVhbC5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzEyODB4NzIwJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIGxhYmVsOiAnR2VzdFx1MDBFM28gZGUgQWx1bm9zIGUgTWF0clx1MDBFRGN1bGFzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hvcnRjdXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdDYWxlbmRcdTAwRTFyaW8gZGUgVHJlaW5vcycsXHJcbiAgICAgICAgICAgIHNob3J0X25hbWU6ICdDYWxlbmRcdTAwRTFyaW8nLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ZlciB0cmVpbm9zIGFnZW5kYWRvcyBwYXJhIGhvamUnLFxyXG4gICAgICAgICAgICB1cmw6ICcvY2FsZW5kYXJpbycsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICcvaWNvbi0xOTJ4MTkyLnBuZycsIHNpemVzOiAnMTkyeDE5MicgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdHZXN0XHUwMEUzbyBkZSBBbHVub3MnLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiAnQWx1bm9zJyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMaXN0YSBkZSBhbHVub3MgZSBtYXRyXHUwMEVEY3VsYXMnLFxyXG4gICAgICAgICAgICB1cmw6ICcvYWx1bm9zJyxcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogJy9pY29uLTE5MngxOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJyB9XVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogJ0ZpbmFuY2Vpcm8nLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiAnRmluYW5jZWlybycsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29udHJvbGUgZGUgcGFnYW1lbnRvcyBlIG1lbnNhbGlkYWRlcycsXHJcbiAgICAgICAgICAgIHVybDogJy9wYWdhbWVudG9zJyxcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogJy9pY29uLTE5MngxOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJyB9XVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn0nXSxcclxuICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC8kL11cclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczogZ2V0TWFudWFsQ2h1bmssXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pKTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUaGlhZ29cXFxcRXNwb3J0aXpcXFxcZXNwb3J0aXpcXFxcc3JjXFxcXGJ1aWxkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUaGlhZ29cXFxcRXNwb3J0aXpcXFxcZXNwb3J0aXpcXFxcc3JjXFxcXGJ1aWxkXFxcXG1hbnVhbENodW5rcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVGhpYWdvL0VzcG9ydGl6L2VzcG9ydGl6L3NyYy9idWlsZC9tYW51YWxDaHVua3MudHNcIjt0eXBlIE1hbnVhbENodW5rUnVsZSA9IHtcbiAgY2h1bmtOYW1lOiBzdHJpbmc7XG4gIHBhY2thZ2VzOiBzdHJpbmdbXTtcbn07XG5cbmNvbnN0IG1hbnVhbENodW5rUnVsZXM6IE1hbnVhbENodW5rUnVsZVtdID0gW1xuICB7XG4gICAgY2h1bmtOYW1lOiAndmVuZG9yLXJlYWN0JyxcbiAgICBwYWNrYWdlczogWydyZWFjdCcsICdyZWFjdC1kb20nLCAnc2NoZWR1bGVyJywgJ3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlJ10sXG4gIH0sXG4gIHtcbiAgICBjaHVua05hbWU6ICd2ZW5kb3Itcm91dGVyJyxcbiAgICBwYWNrYWdlczogWydyZWFjdC1yb3V0ZXInLCAncmVhY3Qtcm91dGVyLWRvbScsICdAcmVtaXgtcnVuL3JvdXRlciddLFxuICB9LFxuICB7XG4gICAgY2h1bmtOYW1lOiAndmVuZG9yLXF1ZXJ5JyxcbiAgICBwYWNrYWdlczogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgfSxcbiAge1xuICAgIGNodW5rTmFtZTogJ3ZlbmRvci1zdXBhYmFzZScsXG4gICAgcGFja2FnZXM6IFsnQHN1cGFiYXNlJ10sXG4gIH0sXG4gIHtcbiAgICBjaHVua05hbWU6ICd2ZW5kb3ItY2hhcnRzJyxcbiAgICBwYWNrYWdlczogW1xuICAgICAgJ3JlY2hhcnRzJyxcbiAgICAgICdyZWNoYXJ0cy1zY2FsZScsXG4gICAgICAnZDMtJyxcbiAgICAgICd2aWN0b3J5LXZlbmRvcicsXG4gICAgICAnZGVjaW1hbC5qcy1saWdodCcsXG4gICAgICAnaW50ZXJubWFwJyxcbiAgICAgICdsb2Rhc2gnLFxuICAgICAgJ3JlYWN0LWlzJyxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgY2h1bmtOYW1lOiAndmVuZG9yLWljb25zJyxcbiAgICBwYWNrYWdlczogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAge1xuICAgIGNodW5rTmFtZTogJ3ZlbmRvci11aScsXG4gICAgcGFja2FnZXM6IFtcbiAgICAgICdAcmFkaXgtdWknLFxuICAgICAgJ2NtZGsnLFxuICAgICAgJ2VtYmxhLWNhcm91c2VsLXJlYWN0JyxcbiAgICAgICdpbnB1dC1vdHAnLFxuICAgICAgJ25leHQtdGhlbWVzJyxcbiAgICAgICdyZWFjdC1kYXktcGlja2VyJyxcbiAgICAgICdzb25uZXInLFxuICAgICAgJ3RhaWx3aW5kLW1lcmdlJyxcbiAgICAgICd2YXVsJyxcbiAgICBdLFxuICB9LFxuICB7XG4gICAgY2h1bmtOYW1lOiAndmVuZG9yLWRhdGUnLFxuICAgIHBhY2thZ2VzOiBbJ2RhdGUtZm5zJ10sXG4gIH0sXG4gIHtcbiAgICBjaHVua05hbWU6ICd2ZW5kb3ItYW5hbHl0aWNzJyxcbiAgICBwYWNrYWdlczogWydAdmVyY2VsL2FuYWx5dGljcycsICd3ZWItdml0YWxzJ10sXG4gIH0sXG4gIHtcbiAgICBjaHVua05hbWU6ICd2ZW5kb3ItZm9ybXMnLFxuICAgIHBhY2thZ2VzOiBbJ0Bob29rZm9ybScsICdyZWFjdC1ob29rLWZvcm0nLCAnem9kJ10sXG4gIH0sXG5dO1xuXG5mdW5jdGlvbiBub3JtYWxpemVNb2R1bGVJZChpZDogc3RyaW5nKSB7XG4gIHJldHVybiBpZC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbmZ1bmN0aW9uIHBhY2thZ2VNYXRjaGVyKHBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcbiAgaWYgKHBhY2thZ2VOYW1lLmVuZHNXaXRoKCctJykpIHtcbiAgICByZXR1cm4gYC9ub2RlX21vZHVsZXMvJHtwYWNrYWdlTmFtZX1gO1xuICB9XG5cbiAgcmV0dXJuIGAvbm9kZV9tb2R1bGVzLyR7cGFja2FnZU5hbWV9L2A7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNYW51YWxDaHVuayhpZDogc3RyaW5nKSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRJZCA9IG5vcm1hbGl6ZU1vZHVsZUlkKGlkKTtcblxuICBpZiAobm9ybWFsaXplZElkLmluY2x1ZGVzKCdjb21tb25qc0hlbHBlcnMnKSB8fCBub3JtYWxpemVkSWQuaW5jbHVkZXMoJ3ZpdGUvcHJlbG9hZC1oZWxwZXInKSkge1xuICAgIHJldHVybiAndmVuZG9yLXJlYWN0JztcbiAgfVxuXG4gIGlmICghbm9ybWFsaXplZElkLmluY2x1ZGVzKCcvbm9kZV9tb2R1bGVzLycpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1hdGNoaW5nUnVsZSA9IG1hbnVhbENodW5rUnVsZXMuZmluZCgocnVsZSkgPT4gKFxuICAgIHJ1bGUucGFja2FnZXMuc29tZSgocGFja2FnZU5hbWUpID0+IG5vcm1hbGl6ZWRJZC5pbmNsdWRlcyhwYWNrYWdlTWF0Y2hlcihwYWNrYWdlTmFtZSkpKVxuICApKTtcblxuICByZXR1cm4gbWF0Y2hpbmdSdWxlPy5jaHVua05hbWUgPz8gJ3ZlbmRvci1taXNjJztcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1IsU0FBUyxvQkFBb0I7QUFDNVQsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGVBQWU7OztBQ0V4QixJQUFNLG1CQUFzQztBQUFBLEVBQzFDO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxVQUFVLENBQUMsU0FBUyxhQUFhLGFBQWEseUJBQXlCO0FBQUEsRUFDekU7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxVQUFVLENBQUMsZ0JBQWdCLG9CQUFvQixtQkFBbUI7QUFBQSxFQUNwRTtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFVBQVUsQ0FBQyx1QkFBdUI7QUFBQSxFQUNwQztBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFVBQVUsQ0FBQyxXQUFXO0FBQUEsRUFDeEI7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxVQUFVO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFVBQVUsQ0FBQyxjQUFjO0FBQUEsRUFDM0I7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxVQUFVO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFB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
