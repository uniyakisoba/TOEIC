import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages では https://<ユーザー名>.github.io/TOEIC/ で公開されるため、
// ファイルの置き場所の基準（base）を /TOEIC/ にしておく
export default defineConfig({
  base: '/TOEIC/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TOEIC 単語トレーナー',
        short_name: 'TOEIC単語',
        description: 'TOEIC 730点を目指す単語学習アプリ',
        lang: 'ja',
        start_url: '/TOEIC/',
        scope: '/TOEIC/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
