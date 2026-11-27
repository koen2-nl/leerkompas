import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const reviewMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('review') === '1'

const demoUser = { id: 'leervo-review-demo', email: 'demo@leervo.test' }

function emptyQuery() {
  const query = {
    select: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
  }
  return query
}

const reviewSupabase = {
  from: () => emptyQuery(),
  rpc: async () => ({ data: false, error: null }),
  auth: {
    getUser: async () => ({ data: { user: demoUser }, error: null }),
    updateUser: async () => ({ data: { user: demoUser }, error: null }),
    signOut: async () => ({ error: null })
  }
}

// Only the explicit review URL uses local demo data. Every normal URL keeps
// the real Supabase client, so the production login flow is not disabled.
export const isSupabaseConfigured = reviewMode ? false : Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = reviewMode
  ? reviewSupabase
  : isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
