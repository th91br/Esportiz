import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        id: 'com.esportiz.app',
        name: 'Esportiz',
        short_name: 'Esportiz',
        description: 'Gestão que joga junto. Plataforma completa para escolas esportivas.',
        theme_color: '#0D1F3C',
        background_color: '#0D1F3C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        categories: ['business', 'sports', 'productivity'],
        lang: 'pt-BR',
        icons: [
          {
            src: '/icon-192x192.png?v=3',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/maskable-icon-512x512.png?v=3',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/screens/dashboard.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard de Gestão Inteligente'
          },
          {
            src: '/screens/alunos.png',
            sizes: '1280x720',
            type: 'image/png',
            label: 'Gestão de Alunos e Matrículas'
          }
        ],
        shortcuts: [
          {
            name: 'Calendário de Treinos',
            short_name: 'Calendário',
            description: 'Ver treinos agendados para hoje',
            url: '/calendario',
            icons: [{ src: '/icon-192x192.png?v=3', sizes: '192x192' }]
          },
          {
            name: 'Gestão de Alunos',
            short_name: 'Alunos',
            description: 'Lista de alunos e matrículas',
            url: '/alunos',
            icons: [{ src: '/icon-192x192.png?v=3', sizes: '192x192' }]
          },
          {
            name: 'Financeiro',
            short_name: 'Financeiro',
            description: 'Controle de pagamentos e mensalidades',
            url: '/pagamentos',
            icons: [{ src: '/icon-192x192.png?v=3', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
