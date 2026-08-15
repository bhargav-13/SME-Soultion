import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    // Without this Vite falls back to esbuild's classic JSX transform, which needs `React` in
    // scope in every file. The plugin switches on the automatic runtime (and Fast Refresh);
    // the existing `import React from 'react'` lines stay valid either way.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
})
