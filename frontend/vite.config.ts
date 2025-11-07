import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')

  const frontendHost = env.FRONTEND_HOST || 'localhost'
  const frontendPort = parseInt(env.FRONTEND_PORT || '3000', 10)
  const backendHost = env.BACKEND_HOST || 'localhost'
  const backendPort = parseInt(env.BACKEND_PORT || '8080', 10)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@locales': path.resolve(__dirname, '../locales'),
      },
    },
    server: {
      host: frontendHost,
      port: frontendPort,
      proxy: {
        '/api': {
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `http://${backendHost}:${backendPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})