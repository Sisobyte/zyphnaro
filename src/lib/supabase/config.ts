// Central place to check whether real Supabase credentials are configured.
// While this returns false, the app stays fully in mock mode (mock auth,
// mock repositories) so local development and demos keep working without
// any setup. Once real env vars are present, auth and (as repositories are
// migrated) data start hitting Supabase for real.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
