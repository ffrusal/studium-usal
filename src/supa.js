// Cliente de Supabase SOLO para autenticación (Google OAuth).
// El acceso a datos sigue pasando por las Pages Functions con la service key.
// Si las variables VITE_ no están configuradas, devuelve null y la app
// funciona igual en modo demostración.
let _supa = null;
let _intentado = false;

export async function getSupa() {
  if (_intentado) return _supa;
  _intentado = true;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    _supa = createClient(url, anon);
  } catch (e) {
    console.warn("Supabase Auth no disponible:", e);
    _supa = null;
  }
  return _supa;
}

// Headers de autorización para las Pages Functions (si hay sesión real).
export async function authHeaders() {
  const supa = await getSupa();
  if (!supa) return {};
  const { data } = await supa.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
