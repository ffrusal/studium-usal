/**
 * Studium USAL — Pages Function: /api/archivo
 *
 * Guarda y sirve los archivos ORIGINALES de los materiales (Cloudflare R2).
 *
 *   PUT /api/archivo?documentoId=...   (body = bytes del archivo)
 *       -> guarda en R2 y anota r2_key en la tabla documentos
 *   GET /api/archivo?documentoId=...
 *       -> descarga el archivo original
 *
 * Requiere un bucket R2 vinculado al proyecto de Pages con el nombre ARCHIVOS
 * (Settings → Bindings → R2 bucket). Si el binding no está, el PUT devuelve
 * un error suave y la app sigue funcionando (solo sin descargas).
 */

export async function onRequestPut({ request, env }) {
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]) if (!env[k]) return json({ error: `Falta ${k}` }, 500);
  if (!env.ARCHIVOS) return json({ error: "R2 no configurado: agregá el binding ARCHIVOS en Cloudflare Pages." }, 501);

  // misma protección que materiales
  if ((env.REQUIRE_AUTH || "").toLowerCase() === "true") {
    const quien = await verificarRol(request, env);
    if (quien.error) return json({ error: quien.error }, quien.status);
    if (!["docente", "autoridad"].includes(quien.rol)) return json({ error: "Sin permisos." }, 403);
  }

  const url = new URL(request.url);
  const documentoId = url.searchParams.get("documentoId");
  if (!documentoId) return json({ error: "Falta documentoId" }, 400);

  // valido que el documento exista y tomo su nombre/tipo
  const filas = await sb(env, `documentos?id=eq.${encodeURIComponent(documentoId)}&select=id,archivo`);
  if (!filas.length) return json({ error: "Documento inexistente" }, 404);
  const nombre = filas[0].archivo || "documento";
  const tipo = nombre.toLowerCase().endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";

  const datos = await request.arrayBuffer();
  if (!datos.byteLength) return json({ error: "Archivo vacío" }, 400);
  if (datos.byteLength > 40 * 1024 * 1024) return json({ error: "El archivo supera los 40 MB." }, 413);

  const key = `documentos/${documentoId}/${nombre}`;
  await env.ARCHIVOS.put(key, datos, { httpMetadata: { contentType: tipo } });
  await sb(env, `documentos?id=eq.${encodeURIComponent(documentoId)}`, "PATCH", { r2_key: key }, "return=minimal");
  return json({ ok: true, key });
}

export async function onRequestGet({ request, env }) {
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]) if (!env[k]) return json({ error: `Falta ${k}` }, 500);
  if (!env.ARCHIVOS) return json({ error: "R2 no configurado." }, 501);
  const url = new URL(request.url);
  const documentoId = url.searchParams.get("documentoId");
  if (!documentoId) return json({ error: "Falta documentoId" }, 400);
  const filas = await sb(env, `documentos?id=eq.${encodeURIComponent(documentoId)}&select=r2_key,archivo`);
  if (!filas.length || !filas[0].r2_key) return json({ error: "Este documento no tiene archivo original guardado." }, 404);
  const obj = await env.ARCHIVOS.get(filas[0].r2_key);
  if (!obj) return json({ error: "Archivo no encontrado en el almacenamiento." }, 404);
  const nombre = filas[0].archivo || "documento";
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${nombre.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=600",
    },
  });
}

async function verificarRol(request, env) {
  if (!env.SUPABASE_ANON_KEY) return { error: "Falta SUPABASE_ANON_KEY.", status: 500 };
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { error: "Necesitás iniciar sesión institucional.", status: 401 };
  const rUser = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!rUser.ok) return { error: "Sesión inválida o vencida.", status: 401 };
  const user = await rUser.json();
  const filas = await sb(env, `profiles?id=eq.${encodeURIComponent(user.id)}&select=rol`).catch(() => []);
  return { rol: filas[0]?.rol || "estudiante" };
}

async function sb(env, ruta, metodo = "GET", body = null, prefer = null) {
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
  if (!r.ok) throw new Error(`Supabase ${metodo} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  if (r.status === 204) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
