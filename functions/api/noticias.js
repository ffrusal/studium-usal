/**
 * Studium USAL — Pages Function: GET /api/noticias
 *
 * Lee los feeds RSS públicos de medios argentinos y devuelve los titulares
 * del día (título, resumen corto, link, medio, fecha). No requiere claves.
 *
 * Los feeds son la vía legítima y estable para esto (los publican los propios
 * medios). Si uno falla o cambia, los demás siguen respondiendo; Google News
 * Argentina actúa como red de seguridad (agrega a todos los medios del país).
 *
 * Para sumar o quitar medios, editá la constante FEEDS.
 */
const FEEDS = [
  { medio: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
  { medio: "Infobae", url: "https://www.infobae.com/feeds/rss/" },
  { medio: "Google News (Argentina)", url: "https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419" },
];

const MAX_POR_FEED = 12;
const MAX_TOTAL = 30;

export async function onRequestGet() {
  const resultados = await Promise.allSettled(FEEDS.map((f) => leerFeed(f)));
  const noticias = [];
  const fallidos = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") noticias.push(...r.value);
    else fallidos.push(FEEDS[i].medio);
  });
  if (!noticias.length) {
    return json({ error: "No se pudieron obtener noticias de los medios configurados.", fallidos }, 502);
  }
  noticias.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  return json({ noticias: noticias.slice(0, MAX_TOTAL), fallidos });
}

async function leerFeed({ medio, url }) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; StudiumUSAL/1.0; lector RSS educativo)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    cf: { cacheTtl: 600, cacheEverything: true }, // cache 10 min en el edge
  });
  if (!r.ok) throw new Error(`${medio} HTTP ${r.status}`);
  const xml = await r.text();
  const items = [];
  for (const bloque of xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []) {
    const titulo = limpiar(extraer(bloque, "title"));
    const link = limpiar(extraer(bloque, "link"));
    const resumen = limpiar(extraer(bloque, "description")).slice(0, 280);
    const fecha = aISO(extraer(bloque, "pubDate"));
    if (titulo && link) items.push({ medio, titulo, link, resumen, fecha });
    if (items.length >= MAX_POR_FEED) break;
  }
  if (!items.length) throw new Error(`${medio}: feed sin items`);
  return items;
}

function extraer(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function limpiar(s) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function aISO(d) {
  const t = Date.parse(d || "");
  return isNaN(t) ? "" : new Date(t).toISOString();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
}
