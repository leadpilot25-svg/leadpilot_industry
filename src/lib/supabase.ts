import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== ''

// Export a real client only when env vars are present.
// Components check `supabaseConfigured` before calling auth methods.
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : // Stub that satisfies the type but is never called when unconfigured
    (null as unknown as SupabaseClient)
