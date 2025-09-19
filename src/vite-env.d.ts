// FIX: Replaced the 'vite/client' reference that was causing an error
// with manual type definitions for Vite's `import.meta.env`. This resolves
// the "Cannot find type definition file for 'vite/client'" error and the
// subsequent errors in `src/index.tsx` related to `import.meta.env`.
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
