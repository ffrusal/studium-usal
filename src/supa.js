// Cliente de Supabase SOLO para autenticación (Google OAuth).
// El acceso a datos sigue pasando por las Pages Functions con la service key.
// Si las variables VITE_ no están configuradas, devuelve null y la app
// funciona igual en modo demostración.
//
// Importante: el singleton guarda la PROMESA (no la instancia), así las
// llamadas concurrentes esperan a la misma creación en vez de recibir null.
let _promesa = null;

export function getSupa() {
  if (!_promesa) {
    _promesa = (async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !anon) return null;
      try {
        const { createClient } = await import("@supabase/supabase-js");
        return createClient(url, anon);
      } catch (e) {
        console.warn("Supabase Auth no disponible:", e);
        return null;
      }
    })();
  }
  return _promesa;
}

// Headers de autorización para las Pages Functions (si hay sesión real).
export async function authHeaders() {
  const supa = await getSupa();
  if (!supa) return {};
  try {
    const { data } = await supa.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}
