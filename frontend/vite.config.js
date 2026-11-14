import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages project sites are served under /<repository-name>/.
  // Local development keeps the root path.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/Transport/' : '/',
  plugins: [react(), tailwindcss()]
})
