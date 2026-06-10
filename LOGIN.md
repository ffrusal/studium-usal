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
