# AGENTS.md

## Qué es esto

Clon de Asteroids en canvas HTML5 puro. **Sin bundler, sin dependencias, sin build, sin tests, no lint.** Todo el juego vive en un único `game.js` cargado como `<script>` clásico (sin módulos ES) desde `index.html`.

## Cómo correr

Abrir `index.html` en el navegador directamente, o:

```bash
npx serve .
```

No hay comandos de verificación (lint/typecheck/test): no inventarlos ni agregar tooling salvo que se pida.

## Estructura

- `index.html` — solo el canvas (800×600, id `canvas`) y estilos mínimos
- `game.js` — toda la lógica, organizada por secciones con comentarios `// ── Nombre ──`: Input, Utils, Bullet, Asteroid, Ship, Partículas, Estado, Update, Draw, Loop
- La constante `W`/`H` (800×600) se define en `game.js`, no en HTML: si se cambia el tamaño, cambiar ambos

## Convenciones del código (seguir el patrón existente)

- Estados del juego como string global: `'playing' | 'dead' | 'gameover'` (en `state`)
- Todo objeto tiene `update(dt)` y `draw()`; se marcan con `dead = true` y se filtran cada frame
- El espacio es toroidal: usar `wrap(v, max)` en cada movimiento de posición
- Input: `keys[code]` para estado mantenido, `pressed(code)` (consume `justPressed`) para acción de un solo disparo
- Tablas de balance como arrays indexados por tamaño con índice 0 inservible: `RADII`, `SPEEDS`, `POINTS` (tamaños 1=pequeño … 3=grande)
- Comentarios del código y docs en español

## Discrepancia conocida

El `README.md` menciona power-ups y "estrella fugaz", pero **no existen en `game.js`**. El código es la fuente de verdad; actualizar el README si se implementan (o asumir que es aspiracional).
