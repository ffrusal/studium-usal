/**
 * Studium USAL — Pages Function: /api/indexar
 *
 * Indexación de documentos desde la web. El NAVEGADOR parsea el PDF
 * (pdf.js) y manda los fragmentos de texto; acá se generan los
 * embeddings (OpenRouter) y se guardan en Supabase. La service_role
 * key nunca sale del servidor.
 *
 * Acciones (POST, JSON):
 *   { accion:"crear",  catedraId, titulo, archivo, paginas }   -> { documentoId }
 *   { accion:"chunks", documentoId, catedraId, chunks:[{contenido,pagina,posicion,tokens}] } -> { ok, n }
 *   { accion:"estado", documentoId, estado }                   -> { ok }
 *   { accion:"borrar", documentoId }                           -> { ok }
 * Listado (GET):
 *   /api/indexar?catedraId=...  -> { documentos:[{id,titulo,archivo,paginas,estado,creado_en,chunks}] }
 *
 * Variables: OPENROUTER_API_KEY, EMBED_MODEL, EMBED_DIM, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const MAX_CHUNKS_POR_LOTE = 16;        // mismo batch que el script local
const MAX_CHARS_CHUNK = 4000;          // sanidad: un chunk no debería superar esto

export async function onRequestGet({ request, env }) {
  const err = faltantes(env); if (err) return json({ error: err }, 500);
  const url = new URL(request.url);
  const catedraId = url.searchParams.get("catedraId");
  if (!catedraId) return json({ error: "Falta catedraId" }, 400);
  // documentos de la cátedra
  const docs = await sbFetch(env, `documentos?catedra_id=eq.${encodeURIComponent(catedraId)}&select=id,titulo,archivo,paginas,estado,creado_en&order=creado_en.desc`);
  // conteo de chunks por documento (una consulta agregada)
  const conteos = await sbFetch(env, `chunks?catedra_id=eq.${encodeURIComponent(catedraId)}&select=documento_id`);
  const porDoc = {};
  for (const c of conteos) porDoc[c.documento_id] = (porDoc[c.documento_id] || 0) + 1;
  return json({ documentos: docs.map((d) => ({ ...d, chunks: porDoc[d.id] || 0 })) });
}

export async function onRequestPost({ request, env }) {
  const err = faltantes(env); if (err) return json({ error: err }, 500);

  // Protección de escrituras: se activa con REQUIRE_AUTH="true" en el entorno.
  // Requiere sesión real de Supabase con rol docente o autoridad.
  if ((env.REQUIRE_AUTH || "").toLowerCase() === "true") {
    const quien = await verificarRol(request, env);
    if (quien.error) return json({ error: quien.error }, quien.status);
    if (!["docente", "autoridad"].includes(quien.rol))
      return json({ error: "Tu cuenta no tiene permisos para gestionar materiales." }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const accion = body.accion;

  try {
    if (accion === "crear") {
      const { catedraId, titulo, archivo, paginas } = body;
      if (!catedraId || !titulo) return json({ error: "Falta catedraId o titulo" }, 400);
      const r = await sbFetch(env, "documentos", "POST", {
        catedra_id: catedraId, titulo, archivo: archivo || null,
        paginas: paginas || null, estado: "procesando",
      }, "return=representation");
      return json({ documentoId: r[0].id });
    }

    if (accion === "chunks") {
      const { documentoId, catedraId, chunks } = body;
      if (!documentoId || !catedraId || !Array.isArray(chunks) || !chunks.length)
        return json({ error: "Falta documentoId, catedraId o chunks" }, 400);
      if (chunks.length > MAX_CHUNKS_POR_LOTE)
        return json({ error: `Máximo ${MAX_CHUNKS_POR_LOTE} chunks por solicitud` }, 400);
      const textos = chunks.map((c) => String(c.contenido || "").slice(0, MAX_CHARS_CHUNK));
      const vecs = await embed(textos, env);
      const dim = parseInt(env.EMBED_DIM || "2048", 10);
      const filas = chunks.map((c, i) => {
        if (vecs[i].length !== dim) throw new Error(`Dimensión inesperada ${vecs[i].length} (esperaba ${dim})`);
        return {
          documento_id: documentoId, catedra_id: catedraId,
          contenido: textos[i], pagina: c.pagina ?? null,
          posicion: c.posicion ?? null, tokens: c.tokens ?? null,
          embedding: vecs[i],
        };
      });
      await sbFetch(env, "chunks", "POST", filas, "return=minimal");
      return json({ ok: true, n: filas.length });
    }

    if (accion === "estado") {
      const { documentoId, estado } = body;
      if (!documentoId || !estado) return json({ error: "Falta documentoId o estado" }, 400);
      await sbFetch(env, `documentos?id=eq.${encodeURIComponent(documentoId)}`, "PATCH", { estado }, "return=minimal");
      return json({ ok: true });
    }

    if (accion === "borrar") {
      const { documentoId } = body;
      if (!documentoId) return json({ error: "Falta documentoId" }, 400);
      await sbFetch(env, `documentos?id=eq.${encodeURIComponent(documentoId)}`, "DELETE", null, "return=minimal");
      return json({ ok: true });
    }

    return json({ error: `Acción desconocida: ${accion}` }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

// ---- verificación de sesión y rol (solo si REQUIRE_AUTH=true) ----
async function verificarRol(request, env) {
  if (!env.SUPABASE_ANON_KEY) return { error: "Falta SUPABASE_ANON_KEY para verificar sesiones.", status: 500 };
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { error: "Necesitás iniciar sesión institucional para gestionar materiales.", status: 401 };
  const rUser = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!rUser.ok) return { error: "Sesión inválida o vencida.", status: 401 };
  const user = await rUser.json();
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=rol`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
  });
  const filas = r.ok ? await r.json() : [];
  return { rol: filas[0]?.rol || "estudiante" };
}

// ---- embeddings (OpenRouter, OpenAI-compatible) ----
async function embed(textos, env) {
  const r = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://studium-usal.pages.dev",
      "X-Title": "Studium USAL",
    },
    body: JSON.stringify({
      input: textos,
      model: env.EMBED_MODEL || "qwen/qwen3-embedding-8b",
      encoding_format: "float",
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter embeddings ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const dim = parseInt(env.EMBED_DIM || "2048", 10);
  return j.data
    .sort((a, b) => a.index - b.index)
    .map((d) => (d.embedding.length > dim ? d.embedding.slice(0, dim) : d.embedding));
}

// ---- Supabase REST (PostgREST) ----
async function sbFetch(env, ruta, metodo = "GET", body = null, prefer = null) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`Supabase ${metodo} ${ruta.split("?")[0]} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  if (r.status === 204) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

function faltantes(env) {
  for (const k of ["OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"])
    if (!env[k]) return `Falta ${k} en el entorno.`;
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
