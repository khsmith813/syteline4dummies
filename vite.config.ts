/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/syteline4dummies/',
  plugins: [tailwindcss(), react()],
  server: {
    allowedHosts: true,
  },
  test: {
    environment: 'node',
  },
})
