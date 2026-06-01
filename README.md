# Studium · USAL — Vicerrectorado de Formación

Plataforma de estudio para las materias transversales de Formación (Filosofía, Teología,
Ética, Ética Profesional y Seminario Filosófico-Teológico). React + Vite, con un asistente,
autoevaluación y planificador potenciados por IA, *grounded* en el programa y la bibliografía
de cada cátedra.

- **Frontend:** React + Vite
- **Backend de IA:** Cloudflare Pages Function (`/api/chat`) que proxea a OpenRouter
- **La API key nunca llega al navegador:** vive como *secret* en Cloudflare

---

## 1. Probar en local (solo la interfaz)

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. La UI funciona, pero el asistente/autoevaluación/planificador
**no responden** porque `/api/chat` solo corre en Cloudflare. Para probar la IA en local, ver más abajo.

## 2. Probar en local CON la IA

```bash
cp .dev.vars.example .dev.vars     # y poné tu OPENROUTER_API_KEY adentro
npm install
npm run build
npm run pages:dev                   # sirve dist + la function /api/chat
```

## 3. Deploy a Cloudflare Pages (la URL para mostrar)

1. Subí el repo a GitHub.
2. En el panel de **Cloudflare → Workers & Pages → Create → Pages → Connect to Git**, elegí el repo.
3. Configuración de build:
   - **Framework preset:** Vite (o "None")
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. En **Settings → Environment variables (Production)** agregá:
   - `OPENROUTER_API_KEY` = tu clave de https://openrouter.ai/keys  *(marcala como Secret/Encrypt)*
   - `OPENROUTER_MODEL` = `anthropic/claude-3.5-sonnet` *(opcional; podés poner otro modelo de OpenRouter)*
5. **Save and Deploy.** Queda en `https://studium-usal.pages.dev` (o tu dominio).

> Si cambiás las variables después del primer deploy, volvé a hacer "Retry deployment" para que tomen efecto.

---

## Estructura

```
studium-usal/
├─ functions/
│  └─ api/
│     └─ chat.js        # Pages Function: proxy a OpenRouter (lee OPENROUTER_API_KEY)
├─ src/
│  ├─ App.jsx           # La aplicación Studium completa
│  ├─ main.jsx
│  └─ styles.css
├─ index.html
├─ vite.config.js
└─ package.json
```

## Cómo funciona el grounding por cátedra

El asistente arma su *system prompt* con la fundamentación, el programa, la bibliografía y los
documentos de **la cátedra seleccionada**, y se le instruye responder solo desde ahí. En esta
versión los datos viven en el front (`src/App.jsx`). El siguiente paso de producción es mover
las cátedras a **Supabase** y reemplazar la inyección de contexto por **RAG con pgvector**
(buscar fragmentos filtrando por `catedra_id`), manteniendo este mismo `/api/chat`.

## Notas

- El login y los roles (Estudiante / Docente / Autoridad) están simulados; en producción se
  resuelven con **Google OAuth restringido a `@usal.edu.ar`** + tabla `profiles` con RLS en Supabase.
- Modelo por defecto: `anthropic/claude-3.5-sonnet`. Para abaratar, podés usar un modelo más
  liviano vía `OPENROUTER_MODEL` (cualquier ID válido de OpenRouter).
