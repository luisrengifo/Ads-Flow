// Fix: Manually define types for environment variables to resolve compilation errors.
// This replaces the failing `/// <reference types="vite/client" />` directive
// and provides explicit types for `import.meta.env` and `process.env`.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// This augments the NodeJS.ProcessEnv interface to add type safety for the
// custom API_KEY environment variable exposed via vite.config.ts.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
