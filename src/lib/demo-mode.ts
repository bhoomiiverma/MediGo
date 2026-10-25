export const demoMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  return !(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
  );
};

export const supabaseUrl = (): string | null => {
  return import.meta.env.VITE_SUPABASE_URL ?? null;
};

export const supabaseAnonKey = (): string | null => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? null;
};
