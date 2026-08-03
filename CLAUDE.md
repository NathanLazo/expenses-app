# CLAUDE.md

Lee **[AGENTS.md](AGENTS.md)** primero: stack, comandos, mapa del código,
convenciones y el sistema de diseño están ahí. Este archivo sólo agrega lo
específico de Claude Code.

## Lo mínimo para no romper nada

- Interfaz y comentarios en español.
- Los procedimientos tRPC devuelven `{ error, result, status, message }`, no
  lanzan. Lee `data?.result`.
- No regeneres las primitivas de `src/components/ui`: ya están personalizadas
  sobre los tokens del proyecto.
- Colores, radios y duraciones salen de `src/styles/globals.css`. Nunca a mano.
- `pnpm typecheck` y `pnpm lint` antes de dar algo por terminado.

## Previsualización

Hay dos configuraciones en `.claude/launch.json`: `expenses-dev` (puerto 3000) y
`expenses-dev-3001`. Arranca el servidor con `preview_start`, no con Bash. Si el
3000 ya está ocupado por otra sesión, usa el 3001.

Cuando toques UI, verifica en el navegador antes de reportar: revisa consola,
lee la página y comprueba claro y oscuro. No le pidas al usuario que lo mire.

## Cambios de diseño

`DESIGN.md` es la referencia de marca y trae vendorizada la skill `ui-skills`.
Para trabajo de UI, invoca la skill y declara el design read y los diales antes
de escribir código. Los diales de este producto son `DESIGN_VARIANCE: 4`,
`MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 5`: es un dashboard de uso diario, no
una landing.
