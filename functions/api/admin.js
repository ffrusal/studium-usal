/**
 * Studium USAL — Pages Function: /api/admin
 *
 * Panel de administración (vista Autoridad):
 *   GET  ?seccion=usuarios    -> perfiles + último ingreso (Supabase Auth admin)
 *   GET  ?seccion=analiticas  -> usuarios, consultas 30d, documentos, por cátedra
 *   GET  ?seccion=config      -> configuración efectiva (config DB pisa al entorno)
 *   POST { accion:"rol",    email, rol }      -> cambia el rol de un usuario
 *   POST { accion:"config", clave, valor }    -> guarda una clave de configuración
 *
 * Con REQUIRE_AUTH=true, todo /api/admin exige sesión real con rol autoridad.
 */

const CLAVES_CONFIG = [
  "OPENROUTER_MODEL",   // modelo de respuesta del asistente
  "MODEL_ACTIVIDADES",  // modelo para generar consignas/planificaciones (vacío = usar OPENROUTER_MODEL)
  "EMBED_MODEL",        // modelo de embeddings (¡cambiarlo exige re-indexar!)
  "EMBED_DIM",
  "RAG_MATCH_COUNT",
  "RAG_MIN_SIM",
];

export async function onRequestGet({ request, env }) {
  const err = faltantes(env); if (err) return json({ error: err }, 500);
  const gate = await exigirAutoridad(request, env); if (gate) return gate;
  const url = new URL(request.url);
  const seccion = url.searchParams.get("seccion") || "config";
  try {
    if (seccion === "usuarios") return json(await usuarios(env));
    if (seccion === "analiticas") return json(await analiticas(env));
    if (seccion === "config") return json(await configEfectiva(env));
    return json({ error: `Sección desconocida: ${seccion}` }, 400);
  } catch (e) { return json({ error: String(e) }, 500); }
}

export async function onRequestPost({ request, env }) {
  const err = faltantes(env); if (err) return json({ error: err }, 500);
  const gate = await exigirAutoridad(request, env); if (gate) return gate;
  let body; try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  try {
    if (body.accion === "rol") {
      const { email, rol } = body;
      if (!email || !["estudiante", "docente", "autoridad"].includes(rol)) return json({ error: "Datos inválidos" }, 400);
      await sb(env, `profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`, "PATCH", { rol }, "return=minimal");
      return json({ ok: true });
    }
    if (body.accion === "config") {
      const { clave, valor } = body;
      if (!CLAVES_CONFIG.includes(clave)) return json({ error: `Clave no permitida: ${clave}` }, 400);
      await sb(env, "config", "POST", { clave, valor: String(valor ?? "") }, "resolution=merge-duplicates,return=minimal");
      return json({ ok: true });
    }
    return json({ error: `Acción desconocida: ${body.accion}` }, 400);
  } catch (e) { return json({ error: String(e) }, 500); }
}

// ---------- secciones ----------
async function usuarios(env) {
  const perfiles = await sb(env, "profiles?select=email,nombre,rol,creado_en&order=creado_en.desc");
  // último ingreso desde Supabase Auth (admin)
  let ultimo = {};
  try {
    const r = await fetch(`${base(env)}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
    });
    if (r.ok) {
      const j = await r.json();
      for (const u of j.users || []) ultimo[(u.email || "").toLowerCase()] = u.last_sign_in_at || null;
    }
  } catch {}
  return { usuarios: perfiles.map((p) => ({ ...p, ultimo_ingreso: ultimo[p.email] || null })) };
}

async function analiticas(env) {
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const [perfiles, eventos, cobertura] = await Promise.all([
    sb(env, "profiles?select=rol"),
    sb(env, `eventos?select=tipo,catedra_id&creado_en=gte.${desde}`).catch(() => []),
    sb(env, "v_cobertura_rag?select=*").catch(() => []),
  ]);
  const roles = {}; for (const p of perfiles) roles[p.rol] = (roles[p.rol] || 0) + 1;
  const porTipo = {}; const porCatedra = {};
  for (const e of eventos) {
    porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
    if (e.tipo === "consulta" && e.catedra_id) porCatedra[e.catedra_id] = (porCatedra[e.catedra_id] || 0) + 1;
  }
  return { usuarios_total: perfiles.length, roles, ultimos_30_dias: porTipo, consultas_por_catedra: porCatedra, rag: cobertura };
}

async function configEfectiva(env) {
  let guardada = {};
  try { for (const c of await sb(env, "config?select=clave,valor")) guardada[c.clave] = c.valor; } catch {}
  const defaults = {
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    MODEL_ACTIVIDADES: env.MODEL_ACTIVIDADES || "",
    EMBED_MODEL: env.EMBED_MODEL || "qwen/qwen3-embedding-8b",
    EMBED_DIM: env.EMBED_DIM || "2048",
    RAG_MATCH_COUNT: env.RAG_MATCH_COUNT || "6",
    RAG_MIN_SIM: env.RAG_MIN_SIM || "0.15",
  };
  const efectiva = {};
  for (const k of CLAVES_CONFIG) efectiva[k] = (k in guardada && guardada[k] !== "") ? guardada[k] : defaults[k];
  return { config: efectiva, origen: Object.fromEntries(CLAVES_CONFIG.map((k) => [k, k in guardada && guardada[k] !== "" ? "panel" : "entorno"])) };
}

// ---------- helpers ----------
async function exigirAutoridad(request, env) {
  if ((env.REQUIRE_AUTH || "").toLowerCase() !== "true") return null; // modo demo abierto
  if (!env.SUPABASE_ANON_KEY) return json({ error: "Falta SUPABASE_ANON_KEY" }, 500);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return json({ error: "Necesitás iniciar sesión institucional." }, 401);
  const rUser = await fetch(`${base(env)}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!rUser.ok) return json({ error: "Sesión inválida o vencida." }, 401);
  const user = await rUser.json();
  const filas = await sb(env, `profiles?id=eq.${encodeURIComponent(user.id)}&select=rol`).catch(() => []);
  if (filas[0]?.rol !== "autoridad") return json({ error: "Solo las autoridades acceden a la administración." }, 403);
  return null;
}

function base(env) { return env.SUPABASE_URL.replace(/\/$/, ""); }

async function sb(env, ruta, metodo = "GET", body = null, prefer = null) {
  const r = await fetch(`${base(env)}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`Supabase ${metodo} ${ruta.split("?")[0]} ${r.status}: ${(await r.text()).slice(0, 250)}`);
  if (r.status === 204) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function faltantes(env) {
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]) if (!env[k]) return `Falta ${k} en el entorno.`;
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
