import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // REMOVED: The define block is removed to prevent exposing the API key to the client.
  // API calls will now be proxied through a secure Supabase Edge Function.
})
