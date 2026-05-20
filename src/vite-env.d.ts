/// <reference types="vite/client" />

/**
 *
 */
interface ImportMetaEnv {
  /** Same project as Helvety web `NEXT_PUBLIC_SUPABASE_URL` (required). */
  readonly VITE_SUPABASE_URL?: string;
  /** Same project as Helvety web `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/**
 *
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
