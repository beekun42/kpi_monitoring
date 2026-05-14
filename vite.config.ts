import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authEnabled = Boolean(env.SITE_PASSWORD?.trim())

  return {
    plugins: [react()],
    define: {
      __AUTH_ENABLED__: JSON.stringify(authEnabled),
    },
  }
})
