import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectDirectory = fileURLToPath(new URL('.', import.meta.url))
const repositoryDirectory = resolve(projectDirectory, '../..')

export default defineConfig({
  server: {
    fs: {
      allow: [repositoryDirectory],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          spreadsheet: ['xlsx'],
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
