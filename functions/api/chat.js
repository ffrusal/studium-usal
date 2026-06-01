/**
 * Cloudflare Pages Function — POST /api/chat
 * Proxy seguro a OpenRouter. La API key vive como secret en Cloudflare,
 * nunca llega al navegador.
 *
 * Secrets / variables a configurar en el panel de Cloudflare Pages:
 *   OPENROUTER_API_KEY   (obligatorio)  -> tu clave de https://openrouter.ai
 *   OPENROUTER_MODEL     (opcional)     -> ej: anthropic/claude-3.5-sonnet
 *
 * Recibe:  { system: string, messages: [{role, content}] }
 * Devuelve:{ text: string }  ó  { error: string }
 */
export async function onRequestPost({ request, env }) {
  try {
    const { system, messages } = await request.json();

    if (!env.OPENROUTER_API_KEY) {
      return json({ error: "Falta OPENROUTER_API_KEY en las variables de entorno de Cloudflare Pages." }, 500);
    }

    const model = env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    const body = {
      model,
      max_tokens: 1000,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...(Array.isArray(messages) ? messages : []),
      ],
    };

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        // Opcionales, para el ranking de OpenRouter:
        "HTTP-Referer": "https://studium-usal.pages.dev",
        "X-Title": "Studium USAL",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const detail = await r.text();
      return json({ error: `OpenRouter ${r.status}: ${detail.slice(0, 400)}` }, 502);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
