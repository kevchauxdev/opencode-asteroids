'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const torusDist = (a, b) => Math.hypot(
  wrap(a.x - b.x + W / 2, W) - W / 2,
  wrap(a.y - b.y + H / 2, H) - H / 2
);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── EnemyBullet ────────────────────────────────────────────────────────────────
class EnemyBullet {
  constructor(x, y, angle) {
    const SPEED = 230;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 3.5;
    this.radius = 3;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── ShootingStar (estrella fugaz) ─────────────────────────────────────────────
const STAR_LIFE   = 5;      // segundos antes de desaparecer
const STAR_SPEED  = 260;    // velocidad base (vs 85 del asteroide pequeño)
const STAR_POINTS = 200;
const STAR_CHANCE = 0.15;   // probabilidad por asteroide al spawnear el nivel
const STAR_COLOR  = '#ffd23f';
const STAR_SPARK_INTERVAL = 0.05;

class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    this.isStar = true;
    this.ttl = STAR_LIFE;

    // Velocidad mucho mayor que un asteroide normal
    const angle = rand(0, Math.PI * 2);
    const speed = STAR_SPEED + rand(-30, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.sparkTimer = 0;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;

    this.sparkTimer -= dt;
    while (this.sparkTimer <= 0 && !this.dead) {
      this.emitSpark();
      this.sparkTimer += STAR_SPARK_INTERVAL;
    }
  }

  emitSpark() {
    const speed = Math.hypot(this.vx, this.vy);
    const tailX = this.x - this.vx / speed * this.radius;
    const tailY = this.y - this.vy / speed * this.radius;
    const spark = new Particle(wrap(tailX, W), wrap(tailY, H), STAR_COLOR);
    spark.vx += this.vx * 0.25;
    spark.vy += this.vy * 0.25;
    spark.life = rand(0.3, 0.6);
    spark.ttl = spark.life;
    particles.push(spark);
  }

  // No se parte en fragmentos
  split() {
    return [];
  }

  draw() {
    if (this.dead) return;

    const alpha = Math.max(this.ttl / STAR_LIFE, 0);
    // Parpadeo de aviso en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const tailX = this.x - this.vx * 0.18;
    const tailY = this.y - this.vy * 0.18;
    const trail = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
    trail.addColorStop(0, `rgba(255, 210, 63, ${alpha})`);
    trail.addColorStop(1, 'rgba(255, 210, 63, 0)');
    ctx.strokeStyle = trail;
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.shadowColor = STAR_COLOR;
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = `rgba(255, 210, 63, ${(alpha * 0.3).toFixed(2)})`;
    ctx.strokeStyle = `rgba(255, 245, 190, ${alpha.toFixed(2)})`;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const radius = this.radius * (i % 2 === 0 ? 1.6 : 0.35);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
const SPEED_DURATION    = 5;     // segundos de efecto
const SPEED_MULT        = 2;     // doble propulsión
const TRIPLE_SHOT_DURATION = 5;  // segundos de triple disparo
const POWER_DROP_CHANCE = 0.15;  // probabilidad de drop por asteroide destruido
const POWER_LIFE        = 10;    // segundos que el power-up queda en pantalla
const TRIPLE_SHOT_COLOR = '#55e6ff';
const SHIELD_DURATION   = 5;     // segundos de protección
const POWER_UP_TYPES = ['speed', 'shield', 'tripleShot'];

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 10;
    this.ttl = POWER_LIFE;
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo de aviso en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    const colors = {
      speed: '#ffd23f',
      shield: '#4deaff',
      tripleShot: TRIPLE_SHOT_COLOR,
    };
    const color = colors[this.type];
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.type === 'speed') {
      // Ícono de rayo
      ctx.beginPath();
      ctx.moveTo( 2, -5);
      ctx.lineTo(-3,  1);
      ctx.lineTo( 0,  1);
      ctx.lineTo(-2,  5);
      ctx.lineTo( 3, -1);
      ctx.lineTo( 0, -1);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else if (this.type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, -4);
      ctx.lineTo(4, 2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4, 2);
      ctx.lineTo(-5, -4);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      for (const y of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.arc(0, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ── EnemyShip ──────────────────────────────────────────────────────────────────
const ENEMY_SHOOT_INTERVAL = 1.8;
const ENEMY_SHIP_SPEED = 65;
const ENEMY_POINTS = 150;

class EnemyShip {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.dead = false;
    this.shootTimer = 0.8;
    this.angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(this.angle) * ENEMY_SHIP_SPEED;
    this.vy = Math.sin(this.angle) * ENEMY_SHIP_SPEED;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.shootTimer -= dt;
    if (this.shootTimer > 0) return null;

    this.shootTimer = ENEMY_SHOOT_INTERVAL;
    const dx = wrap(ship.x - this.x + W / 2, W) - W / 2;
    const dy = wrap(ship.y - this.y + H / 2, H) - H / 2;
    return new EnemyBullet(this.x, this.y, Math.atan2(dy, dx));
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#ff5b5b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 7, 0, 0, Math.PI * 2);
    ctx.moveTo(-8, -1);
    ctx.lineTo(-4, -7);
    ctx.lineTo(4, -7);
    ctx.lineTo(8, -1);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SHIP_SKINS = [
  {
    id: 'classic', name: 'Clásica', hullColor: '#fff',
    flameColor: '#ff8200', boostedFlameColor: '#ffd23f',
  },
  {
    id: 'cyan', name: 'Cian', hullColor: '#55eaff',
    flameColor: '#36cfff', boostedFlameColor: '#a5f3ff',
  },
  {
    id: 'crimson', name: 'Carmesí', hullColor: '#ff5d73',
    flameColor: '#ff3156', boostedFlameColor: '#ffb4c0',
  },
  {
    id: 'gold', name: 'Dorada', hullColor: '#ffd23f',
    flameColor: '#ff9f1c', boostedFlameColor: '#fff0a6',
  },
];
const SHIP_SKIN_STORAGE_KEY = 'asteroids-ship-skin';

function loadShipSkinIndex() {
  try {
    const savedId = localStorage.getItem(SHIP_SKIN_STORAGE_KEY);
    const savedIndex = SHIP_SKINS.findIndex(skin => skin.id === savedId);
    return savedIndex >= 0 ? savedIndex : 0;
  } catch {
    return 0;
  }
}

let selectedSkinIndex = loadShipSkinIndex();

function cycleShipSkin() {
  selectedSkinIndex = (selectedSkinIndex + 1) % SHIP_SKINS.length;
  try {
    localStorage.setItem(SHIP_SKIN_STORAGE_KEY, SHIP_SKINS[selectedSkinIndex].id);
  } catch {
    // La selección sigue activa durante esta partida aunque el almacenamiento no esté disponible.
  }
}

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedTimer    = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer   = 0;
    this.dead          = false;
  }

  applySpeed() {
    this.speedTimer = SPEED_DURATION;
  }

  applyTripleShot() {
    this.tripleShotTimer = TRIPLE_SHOT_DURATION;
  }

  applyShield() {
    this.shieldTimer = SHIELD_DURATION;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedTimer > 0 ? SPEED_MULT : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      const SPACING = 7;
      const sideX = -Math.sin(this.angle);
      const sideY = Math.cos(this.angle);
      return [-SPACING, 0, SPACING].map(offset =>
        new Bullet(ox + sideX * offset, oy + sideY * offset, this.angle)
      );
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const skin = SHIP_SKINS[selectedSkinIndex];
    ctx.strokeStyle = skin.hullColor;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    if (this.shieldTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77, 234, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Llama del propulsor (más larga y ámbar con Velocidad activa)
    if (this.thrusting && Math.random() > 0.35) {
      const boosted = this.speedTimer > 0;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, boosted ? 24 : 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? skin.boostedFlameColor : skin.flameColor;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '#fff') {
    this.x  = x;
    this.y  = y;
    this.color = color;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, enemyBullets, enemyShips, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let enemySpawnTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  const forcedStarIndex = level === 1 && count > 1
    ? randInt(1, count - 1)
    : -1;

  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    // En el primer nivel siempre aparece una estrella, en un índice aleatorio.
    const isStar = i === forcedStarIndex || (i > 0 && Math.random() < STAR_CHANCE);
    asteroids.push(isStar ? new ShootingStar(x, y) : new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  enemyBullets = [];
  enemyShips = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  enemySpawnTimer = 6;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  enemyBullets = [];
  enemyShips = [];
  particles = [];
  ship.reset();
  enemySpawnTimer = 6;
  // Las estrellas fugaces no pasan de nivel
  asteroids = asteroids.filter(a => !a.isStar);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyC')) cycleShipSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    enemyShips.forEach(e => {
      const bullet = e.update(dt);
      if (bullet) enemyBullets.push(bullet);
    });
    enemyBullets.forEach(b => b.update(dt));
    enemyShips = enemyShips.filter(e => !e.dead);
    enemyBullets = enemyBullets.filter(b => !b.dead);
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  enemyShips.forEach(e => {
    const bullet = e.update(dt);
    if (bullet) enemyBullets.push(bullet);
  });
  enemyBullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  enemyBullets = enemyBullets.filter(b => !b.dead);
  enemyShips = enemyShips.filter(e => !e.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  if (enemyShips.length === 0) {
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0) {
      const angle = rand(0, Math.PI * 2);
      const distance = Math.max(W, H) * 0.55;
      enemyShips.push(new EnemyShip(
        wrap(ship.x + Math.cos(angle) * distance, W),
        wrap(ship.y + Math.sin(angle) * distance, H)
      ));
      enemySpawnTimer = Math.max(7, 15 - level * 0.5);
    }
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.isStar ? STAR_POINTS : POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < POWER_DROP_CHANCE) {
          const type = POWER_UP_TYPES[randInt(0, POWER_UP_TYPES.length - 1)];
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }

  // Bala del jugador vs nave enemiga
  for (const b of bullets) {
    for (const enemy of enemyShips) {
      if (!enemy.dead && !b.dead && torusDist(b, enemy) < enemy.radius) {
        b.dead = true;
        enemy.dead = true;
        score += ENEMY_POINTS;
        explode(enemy.x, enemy.y, 8);
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);
  enemyShips = enemyShips.filter(e => !e.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'speed') ship.applySpeed();
      else if (p.type === 'shield') ship.applyShield();
      else ship.applyTripleShot();
      explode(p.x, p.y, 5);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Proyectil enemigo vs nave: el escudo bloquea sin consumirse.
  for (const b of enemyBullets) {
    if (b.dead || torusDist(ship, b) >= ship.radius + b.radius) continue;
    b.dead = true;
    if (ship.shieldTimer <= 0 && ship.invincible <= 0) {
      killShip();
      break;
    }
  }
  enemyBullets = enemyBullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (state === 'playing' && ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado (las estrellas fugaces no cuentan)
  if (state === 'playing' && !asteroids.some(a => !a.isStar)) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  ctx.textAlign = 'left';
  ctx.fillStyle = SHIP_SKINS[selectedSkinIndex].hullColor;
  ctx.fillText(`NAVE ${SHIP_SKINS[selectedSkinIndex].name} · C`, 14, 46);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-ups activos
  if (!ship.dead) {
    const activePowers = [];
    if (ship.speedTimer > 0)
      activePowers.push({ label: 'VELOCIDAD', timer: ship.speedTimer, color: '#ffd23f' });
    if (ship.shieldTimer > 0)
      activePowers.push({ label: 'ESCUDO', timer: ship.shieldTimer, color: '#4deaff' });
    if (ship.tripleShotTimer > 0)
      activePowers.push({ label: 'TRIPLE DISPARO', timer: ship.tripleShotTimer, color: TRIPLE_SHOT_COLOR });

    ctx.textAlign = 'center';
    activePowers.forEach((power, index) => {
      ctx.fillStyle = power.color;
      ctx.fillText(`${power.label}  ${power.timer.toFixed(1)}s`, W / 2, 46 + index * 20);
    });
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  enemyShips.forEach(e => e.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
