/// <reference types="vite/client" />

interface ImportMetaEnv {
  // No longer needed as we use relative paths
  // readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
