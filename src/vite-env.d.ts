/// <reference types="vite/client" />

// This augments the NodeJS.ProcessEnv interface to add type safety for the
// custom API_KEY environment variable exposed via vite.config.ts.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
