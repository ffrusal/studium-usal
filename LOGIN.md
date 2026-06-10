# Studium USAL — Login institucional (Google OAuth)

La app ahora tiene **dos formas de entrar**:

- **Ingresar con Google USAL** (real): cuenta `@usal.edu.ar`, rol guardado en la base.
- **Modo demostración**: el login simulado de siempre, con el selector de vistas
  (Estudiante / Docente / Autoridad). Ideal para mostrar la plataforma.

Si el OAuth todavía no está configurado, la app muestra **solo el modo demo**
y funciona como hasta ahora. Nada se rompe.

---

## Paso 1 — SQL de usuarios (una sola vez)

En Supabase → SQL Editor, ejecutá `sql/02_usuarios.sql`. Crea la tabla `profiles`
(con roles estudiante/docente/autoridad), el alta automática al registrarse y la
restricción de dominio: **si el mail no es @usal.edu.ar, el registro falla**.

## Paso 2 — Google OAuth

### 2a. En Google Cloud Console (console.cloud.google.com)
1. Creá un proyecto (o usá uno tuyo) → **APIs y servicios → Pantalla de consentimiento**:
   tipo *Externo*, nombre "Studium USAL", tu mail de soporte. Guardar.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo *Aplicación web*.
3. En **Orígenes autorizados de JavaScript** agregá:
   - `https://studium-usal.pages.dev`
4. En **URI de redireccionamiento autorizados** agregá la URL de callback de Supabase:
   - `https://ktbeqgpalkeztgtvfiux.supabase.co/auth/v1/callback`
5. Crear → copiá el **Client ID** y el **Client Secret**.

### 2b. En Supabase (Dashboard → Authentication → Providers → Google)
1. Activá **Google**, pegá Client ID y Client Secret. Guardar.
2. En **Authentication → URL Configuration**:
   - *Site URL*: `https://studium-usal.pages.dev`
   - *Redirect URLs*: agregá `https://studium-usal.pages.dev` (y `http://localhost:5173` si probás local).

## Paso 3 — Variables en Cloudflare Pages

En **Settings → Environment variables (Production)** agregá a las que ya tenés:

| Variable | Valor | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ktbeqgpalkeztgtvfiux.supabase.co` | el front inicia el OAuth |
| `VITE_SUPABASE_ANON_KEY` | tu **anon key** (Settings → API) | ídem (es pública por diseño) |
| `SUPABASE_ANON_KEY` | la misma anon key | el server verifica los tokens |
| `REQUIRE_AUTH` | `false` por ahora | ver abajo |

> Las `VITE_...` se inyectan al compilar: después de agregarlas hacé un
> **Retry deployment** para que el build las tome.

## Paso 4 — Roles

Todos los que entran con Google quedan como **estudiante**. Para promover:

```sql
update profiles set rol = 'docente'   where email = 'nombre.apellido@usal.edu.ar';
update profiles set rol = 'autoridad' where email = 'franciscojose.f@usal.edu.ar';
```

(Y `select * from v_usuarios;` para auditar quién es qué.)

## Paso 5 — Activar la protección de escrituras (cuando quieras)

Con `REQUIRE_AUTH=false` (default) todo sigue como hoy: el modo demo puede
indexar materiales (útil mientras probás). Cuando pongas `REQUIRE_AUTH=true`:

- Subir/borrar materiales exige **sesión real** con rol docente o autoridad.
- El modo demo queda como **solo lectura** para materiales (puede navegar,
  chatear, ver actividades — pero no tocar el RAG).

## Comportamiento de roles en sesión real

- **estudiante**: va directo a elegir su cátedra; no ve el switch de vistas.
- **docente**: entra al panel; no ve el switch.
- **autoridad**: entra al panel y conserva el switch para previsualizar las
  tres vistas (útil para gestión).
- El **modo demo** mantiene el switch siempre, como hasta ahora.

---

# Administración, analíticas y archivos originales (R2)

## SQL previo

Ejecutá `sql/03_admin_r2.sql` en Supabase. Crea la tabla `config` (configuración
editable desde el panel), `eventos` (analíticas de uso) y agrega la columna
`r2_key` a documentos.

## Panel de Administración

Visible en la vista **Autoridad** → sección "Administración" (⚙). Tres pestañas:

- **Modelos y RAG**: cambiá el modelo del asistente, el de generación docente
  (consignas/planificación), el de embeddings y los parámetros del RAG.
  Los cambios se guardan en la tabla `config`, **pisan a las variables de
  entorno y aplican al instante, sin redeploy**. Campo vacío + Guardar =
  volver al valor del entorno. Para alternar free/pago: usá el slug con o sin
  sufijo `:free` (ej. `meta-llama/llama-3.3-70b-instruct:free`).
  ⚠ Cambiar el **modelo de embeddings** exige borrar y re-indexar los
  documentos (vectores de modelos distintos no son comparables).
- **Usuarios**: lista de cuentas institucionales con último ingreso y cambio
  de rol con un desplegable. (El modo demo no registra usuarios.)
- **Analíticas**: usuarios totales, consultas al asistente e indexaciones de
  los últimos 30 días, consultas por cátedra y cobertura del RAG. Los eventos
  se registran desde que existe la tabla `eventos`.

Con `REQUIRE_AUTH=true`, /api/admin exige sesión real con rol **autoridad**.

## Archivos originales (Cloudflare R2)

Para que los PDFs/Word originales queden guardados y descargables desde
**Bibliografía** (vista del alumno):

1. En Cloudflare → **R2 Object Storage** → Create bucket → nombre sugerido:
   `studium-archivos` (el plan gratuito incluye 10 GB).
2. En tu proyecto de **Pages → Settings → Bindings → Add → R2 bucket**:
   - Variable name: `ARCHIVOS`  ← exacto, así lo busca el código
   - Bucket: `studium-archivos`
3. Redeploy.

Desde ahí, cada material subido por la web guarda también su archivo original,
y en Bibliografía aparece el botón **⇩ Descargar**. Si el binding no está, la
app funciona igual (solo no guarda originales). Los documentos indexados antes
de configurar R2 no tienen original: re-subilos si querés que se puedan descargar.
