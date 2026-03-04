/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASTRONOMY_APP_ID?: string;
  readonly VITE_ASTRONOMY_APP_SECRET?: string;
  readonly VITE_ASTRONOMY_API_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
