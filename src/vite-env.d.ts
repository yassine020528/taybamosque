/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASTRONOMY_API_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
