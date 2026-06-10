/**
 * Studium USAL — Pages Function: GET /api/perfil
 *
 * Recibe el token de sesión de Supabase (Authorization: Bearer <jwt>),
 * lo verifica contra Supabase Auth y devuelve el perfil con su rol.
 * Si el perfil no existe todavía (caso borde), lo crea como estudiante.
 *
 * Variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 */
export async function onRequestGet({ request, env }) {
  for (const k of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"])
    if (!env[k]) return json({ error: `Falta ${k} en el entorno.` }, 500);

  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return json({ error: "Falta el token de sesión" }, 401);

  // 1) Verifico el token contra Supabase Auth
  const rUser = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!rUser.ok) return json({ error: "Sesión inválida o vencida" }, 401);
  const user = await rUser.json();
  const email = (user.email || "").toLowerCase();
  if (!/@usal\.edu\.ar$/i.test(email)) return json({ error: "Solo cuentas @usal.edu.ar" }, 403);

  // 2) Busco el perfil (con service key, no afectado por RLS)
  const sb = (ruta, metodo = "GET", body = null, prefer = null) =>
    fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${ruta}`, {
      method: metodo,
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  let r = await sb(`profiles?id=eq.${encodeURIComponent(user.id)}&select=email,nombre,rol`);
  let filas = r.ok ? await r.json() : [];

  // 3) Caso borde: usuario autenticado sin perfil (ej. creado antes del trigger)
  if (!filas.length) {
    const nombre = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
    const rIns = await sb("profiles", "POST", { id: user.id, email, nombre }, "return=representation");
    if (!rIns.ok) return json({ error: `No se pudo crear el perfil: ${(await rIns.text()).slice(0, 200)}` }, 500);
    filas = await rIns.json();
  }

  const p = filas[0];
  return json({ email: p.email, nombre: p.nombre, rol: p.rol });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
