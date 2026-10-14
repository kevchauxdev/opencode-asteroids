# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Al destruir asteroides pueden soltar power-ups que la nave recoge al tocarlos.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |
| Estrella fugaz | 200  |
| Nave enemiga | 150 |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- **Power-ups**: aparecen con un 15% de probabilidad al destruir un asteroide y desaparecen a los 10 s si no se recogen; el 70% son de Velocidad (doble propulsión durante 5 s) y el 30% son de Escudo (bloquea proyectiles enemigos durante 5 s)
- **Naves enemigas**: aparecen periódicamente, disparan a la nave y otorgan 150 puntos al destruirlas
- **Estrella fugaz**: asteroide especial amarillo con estela, mucho más rápido que los normales; siempre aparece en una posición aleatoria al iniciar la partida y, además, tiene un 15% de probabilidad de aparecer al spawnear cada nivel. No se parte en fragmentos, otorga 200 puntos y desaparece a los 5 s si no se destruye (no cuenta para completar el nivel).
