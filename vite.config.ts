import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This configuration directly uses the environment variable provided by Vercel
    // during the build process, ensuring the API_KEY is correctly exposed to the app.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
