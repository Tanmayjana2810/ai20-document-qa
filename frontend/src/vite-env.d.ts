/// <reference types="vite/client" />

// Type declaration for our custom env var so TypeScript knows about it.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
