// Fix: Manually define types for environment variables to resolve compilation errors.
// This provides explicit types for `import.meta.env`.
// The `process.env.API_KEY` type has been removed as it is no longer exposed to the client.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
