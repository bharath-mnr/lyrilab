// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [ tailwindcss(),react()],
//   base: process.env.VITE_BASE_PATH || '/',
// })

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // loads all `.env` values

  return {
    plugins: [tailwindcss(), react()],
    base: env.VITE_BASE_PATH || '/',
  }
})
