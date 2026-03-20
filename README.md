# Nutria Systems

PWA mobile-first para una heladería: ventas con carrito, caja diaria con apertura/cierre, egresos simples, reportes por sesión y soporte offline básico para ventas y egresos.

## Stack

- Next.js 16 + TypeScript
- Supabase Auth + Postgres + RLS
- Dexie para cola offline en IndexedDB
- Vitest para pruebas de utilidades de negocio

## Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Completa:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Base de datos

Aplica la migración incluida:

```bash
supabase db push
```

o ejecuta el SQL de [`supabase/migrations/20260320120000_init_nutria_systems.sql`](./supabase/migrations/20260320120000_init_nutria_systems.sql) en tu proyecto Supabase.

La migración crea:

- Perfil y negocio por usuario al registrarse
- Catálogo de productos
- Sesiones de caja
- Ventas, líneas de venta, egresos y anulaciones
- Vista `cash_session_summaries`
- Funciones RPC para apertura/cierre, ventas, egresos y anulaciones

## Desarrollo

```bash
npm install
npm run dev
```

Scripts útiles:

```bash
npm run lint
npm run test
npm run build
```

## Rutas principales

- `/` mini portada
- `/login` acceso por email/contraseña
- `/app/venta` venta rápida
- `/app/caja` apertura, egresos y cierre
- `/app/productos` catálogo
- `/app/reportes` historial y anulaciones

## Notas operativas

- La sesión de caja es la unidad del “día” contable.
- Solo puede haber una caja abierta por negocio.
- La apertura/cierre son online-only.
- Offline básico cubre ventas y egresos sobre una sesión ya abierta y cacheada.
