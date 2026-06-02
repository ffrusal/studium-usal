/**
 * Studium USAL — Pages Function: POST /api/chat  (con RAG)
 *
 * Flujo:
 *   1) Embede la pregunta del alumno con NVIDIA (input_type=query)
 *   2) Llama a la función SQL match_chunks en Supabase (filtrando por catedra_id)
 *   3) Arma el prompt con los fragmentos recuperados
 *   4) Responde con OpenRouter, citando documento y página
 *
 * Recibe:  { catedraId: string, system?: string, messages: [{role, content}] }
 * Devuelve:{ text: string, fuentes: [{titulo, pagina, similitud}] }
 *
 * Variables / secrets en Cloudflare Pages:
 *   OPENROUTER_API_KEY      (obligatorio)
 *   OPENROUTER_MODEL        (opcional, default anthropic/claude-3.5-sonnet)
 *   NVIDIA_API_KEY          (obligatorio, para los embeddings)
 *   EMBED_MODEL             (opcional, default nvidia/llama-nemotron-embed-vl-1b-v2)
 *   EMBED_DIM               (opcional, default 2048)
 *   SUPABASE_URL            (obligatorio)
 *   SUPABASE_SERVICE_KEY    (obligatorio; vive solo en el server)
 *   RAG_MATCH_COUNT         (opcional, default 6)
 *   RAG_MIN_SIM             (opcional, default 0.15)
 */
export async function onRequestPost({ request, env }) {
  try {
    const { catedraId, system, messages } = await request.json();

    const need = ["OPENROUTER_API_KEY", "NVIDIA_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
    for (const k of need) if (!env[k]) return json({ error: `Falta ${k} en el entorno.` }, 500);

    const model     = env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
    const embedModel= env.EMBED_MODEL || "nvidia/llama-nemotron-embed-vl-1b-v2";
    const embedDim  = parseInt(env.EMBED_DIM || "2048", 10);
    const matchCount= parseInt(env.RAG_MATCH_COUNT || "6", 10);
    const minSim    = parseFloat(env.RAG_MIN_SIM || "0.15");

    // última pregunta del usuario
    const userMsgs = (messages || []).filter(m => m.role === "user");
    const pregunta = userMsgs.length ? userMsgs[userMsgs.length - 1].content : "";

    let fuentes = [];
    let contexto = "";

    if (catedraId && pregunta) {
      // 1) embedding de la consulta
      const qVec = await embedQuery(pregunta, env.NVIDIA_API_KEY, embedModel, embedDim);
      // 2) búsqueda en Supabase
      const chunks = await matchChunks(env, qVec, catedraId, matchCount, minSim);
      fuentes = chunks.map(c => ({ titulo: c.titulo, pagina: c.pagina, similitud: Number(c.similitud?.toFixed(3)) }));
      // 3) contexto para el prompt
      contexto = chunks.map((c, i) =>
        `[Fragmento ${i + 1} — ${c.titulo}${c.pagina ? `, pág. ${c.pagina}` : ""}]\n${c.contenido}`
      ).join("\n\n");
    }

    // 4) system prompt con grounding
    const sys = buildSystem(system, contexto);

    const orMessages = [
      { role: "system", content: sys },
      ...(Array.isArray(messages) ? messages : []),
    ];

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://studium-usal.pages.dev",
        "X-Title": "Studium USAL",
      },
      body: JSON.stringify({ model, max_tokens: 4096, messages: orMessages }),
    });
    if (!r.ok) {
      const detail = await r.text();
      return json({ error: `OpenRouter ${r.status}: ${detail.slice(0, 400)}` }, 502);
    }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return json({ text, fuentes });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

// ---- embeddings de la consulta (NVIDIA) ----
async function embedQuery(text, key, model, dim) {
  const r = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: [text], model, input_type: "query",
      encoding_format: "float", truncate: "END",
    }),
  });
  if (!r.ok) throw new Error(`NVIDIA embeddings ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  let v = j.data[0].embedding;
  if (v.length > dim) v = v.slice(0, dim);  // Matryoshka: recorte a la dimensión usada
  return v;
}

// ---- búsqueda vectorial en Supabase (RPC a match_chunks) ----
async function matchChunks(env, queryEmbedding, catedraId, matchCount, minSim) {
  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/match_chunks`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      p_catedra_id: catedraId,
      match_count: matchCount,
      min_similitud: minSim,
    }),
  });
  if (!r.ok) throw new Error(`Supabase match_chunks ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return await r.json();
}

// ---- system prompt: obliga a responder SOLO desde el contexto recuperado ----
function buildSystem(baseSystem, contexto) {
  const reglas = [
    baseSystem || "Sos el asistente de estudio de una cátedra de la Universidad del Salvador (USAL).",
    "",
    "REGLAS:",
    "- Respondé ÚNICAMENTE con la información de los fragmentos de contexto provistos abajo.",
    "- Si la respuesta no está en el contexto, decí con claridad que no figura en el material de la cátedra y sugerí reformular o consultar al docente. No inventes.",
    "- Citá la fuente cuando uses un fragmento, con el formato (Documento, pág. N).",
    "- Escribí en español rioplatense, claro y respetuoso, con buen criterio académico.",
    "",
    "CONTEXTO DE LA CÁTEDRA:",
    contexto && contexto.trim().length
      ? contexto
      : "(No se recuperaron fragmentos relevantes para esta consulta.)",
  ];
  return reglas.join("\n");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" },
  });
}
