import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { readSupabaseConfig } from './src/remote/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Fail before bundling if a privileged key was accidentally configured.
  readSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  return {
    base: '/fieldnest/',
    plugins: [
      {
        name: 'fieldnest-build-info',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ revision: process.env.GITHUB_SHA ?? 'local' }) })
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Fieldnest',
          short_name: 'Fieldnest',
          description: 'Your work. Saved wherever you are.',
          theme_color: '#285746',
          background_color: '#f7f8f4',
          display: 'standalone',
          start_url: '/fieldnest/',
          scope: '/fieldnest/',
          id: '/fieldnest/',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          navigateFallback: '/fieldnest/index.html',
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.tsx'],
      css: false,
    },
  }
})
