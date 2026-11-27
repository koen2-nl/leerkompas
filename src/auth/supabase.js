// Offline Supabase stub for the public review demo only.
// No credentials, account data, or network requests are used.
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

export const isSupabaseConfigured = false
export const supabase = {
  from: () => emptyQuery(),
  rpc: async () => ({ data: false, error: null }),
  auth: {
    getUser: async () => ({ data: { user: demoUser }, error: null }),
    updateUser: async () => ({ data: { user: demoUser }, error: null }),
    signOut: async () => ({ error: null })
  }
}
