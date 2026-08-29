import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'prompt-do-icon.png'],
      manifest: {
        name: 'promptdo',
        short_name: 'promptdo',
        description: 'Crie e organize seus melhores prompts com IA.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/',
        start_url: '/forge',
        icons: [
          {
            src: 'prompt-do-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
