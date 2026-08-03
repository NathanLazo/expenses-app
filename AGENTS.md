# AGENTS.md

Guía de trabajo para agentes de código en este repositorio. `CLAUDE.md` apunta
aquí: este archivo es la fuente única.

## Qué es esto

App de control de gastos personales en español. Stack T3: Next.js 15 (App
Router), React 19, TypeScript, tRPC 11, Prisma, Tailwind v4 y shadcn/ui.
El usuario registra gastos a mano, por formulario o subiendo un ticket al chat,
y los revisa por periodo (mes fiscal configurable).

## Comandos

```bash
pnpm dev
```

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm format:write
```

`pnpm check` corre lint y typecheck juntos. En Windows, si no hay `.env`
completo, antepon `SKIP_ENV_VALIDATION=1`. La base de datos se maneja con
`pnpm db:push` (desarrollo) y `pnpm db:studio`.

Antes de dar por terminado un cambio: `pnpm typecheck` y `pnpm lint` en verde.

## Mapa del código

| Ruta | Qué vive ahí |
| --- | --- |
| `src/app` | Rutas del App Router. Cada carpeta tiene `layout.tsx` con su metadata. |
| `src/app/_components` | Componentes de página que no se reutilizan fuera de la ruta raíz. |
| `src/components/layout` | Shell: sidebar, header, navegación móvil. |
| `src/components/ui` | Primitivas shadcn/ui. Ya están personalizadas, no las regeneres. |
| `src/components/common` | Piezas compartidas de producto (stat-card, empty-state, month-switcher). |
| `src/server/api/routers` | Routers tRPC. |
| `src/lib` | Formato, navegación, SEO, tipos derivados de la API. |
| `prisma/schema.prisma` | Modelo de datos. |

## Convenciones

- **Idioma:** la interfaz y los comentarios están en español. Escribe comentarios
  sólo cuando expliquen un porqué que el código no dice; no narres lo obvio.
- **Respuestas de tRPC:** los procedimientos no lanzan, devuelven
  `{ error, result, status, message }`. En el cliente se lee `data?.result` y se
  valida con `isOkResult` de `src/lib/api-types.ts`. Sigue ese patrón al agregar
  procedimientos.
- **Iconos:** `lucide-react` en todo el proyecto. Una sola familia, no mezcles.
- **Client vs Server:** el shell y las pantallas con datos en vivo son
  `"use client"` porque usan tRPC + React Query. Los `layout.tsx` se quedan como
  Server Components para exportar metadata.
- **Estados:** toda vista con datos necesita carga (skeleton con la forma del
  contenido final, no spinner), vacío (`EmptyState` con acción) y error.
- **Imports:** alias `~/` hacia `src/`.

## Sistema de diseño

Los tokens salen de `DESIGN.md` y viven en `src/styles/globals.css`. No pongas
colores, radios ni duraciones a mano en los componentes: usa los tokens.

**Color.** Paleta monocroma en el tono gris-violeta de marca (`#8e8ea0`,
oklch hue 285). Un solo acento en todo el producto. Los colores de categoría
vienen de la base de datos y son la única fuente de color saturado en pantalla;
por eso el chrome de la app se mantiene neutro.

Dos desviaciones deliberadas respecto a `DESIGN.md`, ambas por contraste:

1. El texto de cuerpo no usa `#8e8ea0` (3.2:1 sobre blanco, falla WCAG AA). El
   color de marca vive en anillos de foco, bordes y acentos; el texto usa un
   casi-negro del mismo tono.
2. El relleno de botón primario oscurece `#8e8ea0` hasta 5.2:1 con texto blanco.
   Mismo tono, más profundo.

**Forma (regla única, aplícala siempre).**

| Elemento | Radio | Clase |
| --- | --- | --- |
| Superficies: tarjetas, diálogos, hojas | 8px | `rounded-xl` / `rounded-lg` |
| Controles: botones, inputs, selects | 5px | `rounded-md` |
| Marcas pequeñas: checks, chips | 3px | `rounded-sm` |
| Avatares y puntos de color | círculo | `rounded-full` |

**Superficie.** El sistema no usa sombra para contenido en flujo: la jerarquía
viene del borde y del fondo. Las sombras se reservan para lo que flota de verdad
sobre el contenido (diálogos, popovers, dropdowns, el botón flotante móvil).

**Tipografía.** `system-ui`, sin descarga de fuente. Cuerpo 16px / 1.5. La
jerarquía se controla con peso y color, no con escalas gigantes ni
`tracking-tight`. Hay utilidades `text-display` (48/700) y `text-heading`
(32/600) para títulos de página.

**Espaciado.** Rejilla de 8px: usa utilidades pares (`gap-2` 8px, `gap-4` 16px,
`gap-6` 24px, `gap-8` 32px). Evita `gap-3` / `p-3` en layout nuevo.

**Movimiento.** `--motion-fast`, `--motion-base` y `--motion-slow` valen 400ms
con easing `ease` (`--ease-brand`): son para revelados y cambios de estado de
superficie. El feedback inmediato (hover, `:active`) se queda en 150ms con las
curvas quint, porque a 400ms se siente lento. Todo lo que anime debe degradar
bajo `prefers-reduced-motion`.

**Modo oscuro.** Obligatorio y ya tokenizado. Cualquier cambio de color se
verifica en ambos modos antes de darse por hecho.

## Antes de cerrar un cambio de UI

- Contraste WCAG AA (4.5:1 texto normal) en claro y oscuro.
- Un solo acento, un solo sistema de radios, sin sombras en contenido en flujo.
- Estados de carga, vacío y error cubiertos.
- Sin em-dash (`—`) en texto visible: usa guion normal, coma o punto.
- Nada de números inventados con falsa precisión ni nombres genéricos de relleno.
- `pnpm typecheck` y `pnpm lint` en verde.

## Fuera de alcance

`DESIGN.md` incluye una skill de landing pages. Sus reglas de hero, eyebrows,
bento y marquees no aplican aquí: esto es UI de producto. Lo que sí aplica es la
paleta, la forma, el contraste, los estados y la lista de tells a evitar.
