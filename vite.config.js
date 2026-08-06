import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: this must match your GitHub repo name, wrapped in slashes.
  // If you rename the repo, update this to match or the deployed site
  // will load a blank page (assets will 404).
  base: '/community-board/',
})
