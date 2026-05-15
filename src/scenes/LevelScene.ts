import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y, COLORS } from '../config';
import { ISLANDS, type Island, type IslandId, type ObstacleKind, nextIsland } from '../data/islands';
import { state } from '../systems/state';
import { audio } from '../systems/audio';
import { trackEvent } from '../systems/analytics';
import { RECIPES } from '../data/recipes';
import { isTouchDevice, isMobileViewport, vibrate } from '../systems/device';

interface LevelData { islandId: IslandId; }

type Powerup = 'pearl' | 'magnet' | 'boost' | 'double';

export class LevelScene extends Phaser.Scene {
  private island!: Island;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerState: 'run' | 'jump' | 'slide' | 'hit' = 'run';
  private jumpsLeft = 1;
  private maxJumps = 1;
  private slideTimer = 0;

  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private speed = 320;
  private maxSpeed = 720;
  private distance = 0;
  private score = 0;
  private lives = 3;
  private combo = 0;
  private comboTimer = 0;

  private invincibleUntil = 0;
  private boostUntil = 0;
  private magnetUntil = 0;
  private doubleScoreUntil = 0;

  private spawnTimer = 0;
  private spawnInterval = 900;
  private collectSpawnTimer = 0;
  private powerupSpawnTimer = 0;

  private bgLayers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private groundTile!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;

  private cinematicMode = false;
  private bossPhase: 'none' | 'incoming' | 'active' | 'done' = 'none';
  private bossTriggerScore = 1500;
  private isPaused = false;

  private touchButtonZones: Phaser.Geom.Rectangle[] = [];
  private hintOverlay?: Phaser.GameObjects.Container;

  constructor() { super('Level'); }

  private get pbody(): Phaser.Physics.Arcade.Body {
    return this.player.body as Phaser.Physics.Arcade.Body;
  }

  init(data: LevelData): void {
    this.island = ISLANDS[data?.islandId ?? 'martinique'];
    this.speed = 320;
    this.distance = 0;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.invincibleUntil = 0;
    this.boostUntil = 0;
    this.magnetUntil = 0;
    this.doubleScoreUntil = 0;
    this.maxJumps = 2; // double-jump enabled by default
    this.bossPhase = 'none';
    this.cinematicMode = false;
    this.isPaused = false;
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.buildBackground();

    // Ground
    this.groundTile = this.add.tileSprite(0, GROUND_Y, GAME_WIDTH, 80, 'bg_ground').setOrigin(0, 0);
    this.groundTile.setDepth(5);

    // Hibiscus deco scattered
    for (let i = 0; i < 3; i++) {
      this.add.image(Phaser.Math.Between(50, GAME_WIDTH - 50), GROUND_Y + 50, 'bg_hibiscus')
        .setScale(0.6).setAlpha(0.6).setDepth(6);
    }

    // Player
    this.player = this.physics.add.sprite(140, GROUND_Y - 10, 'player_run_0').setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(false);
    this.pbody.setSize(40, 80).setOffset(17, 16);
    this.player.setDepth(20);

    // Run animation
    if (!this.anims.exists('run')) {
      this.anims.create({
        key: 'run',
        frames: [0, 1, 2, 3].map((i) => ({ key: `player_run_${i}` })),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.player.play('run');

    // Particles (jump dust)
    this.particles = this.add.particles(0, 0, 'particle_sand', {
      speed: { min: -80, max: 80 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 0,
      emitting: false,
    });
    this.particles.setDepth(15);

    // Groups
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.physics.add.overlap(this.player, this.obstacles, (_p, o) => this.onHitObstacle(o as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.collectibles, (_p, c) => this.onCollect(c as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.powerups, (_p, c) => this.onPowerup(c as Phaser.Physics.Arcade.Sprite));

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyZ = this.input.keyboard!.addKey('SPACE');
    this.keyDown = this.input.keyboard!.addKey('S');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Skip if the tap landed on one of the on-screen UI controls
      for (const zone of this.touchButtonZones) {
        if (zone.contains(pointer.x, pointer.y)) return;
      }
      // Top 60% of the canvas = jump, bottom 40% = slide
      if (pointer.y > GAME_HEIGHT * 0.6) this.startSlide();
      else this.tryJump();
    });

    this.input.keyboard!.on('keydown-UP', () => this.tryJump());
    this.input.keyboard!.on('keydown-SPACE', () => this.tryJump());
    this.input.keyboard!.on('keydown-DOWN', () => this.startSlide());
    this.input.keyboard!.on('keydown-S', () => this.startSlide());
    this.input.keyboard!.on('keydown-P', () => this.togglePause());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());

    // Touch controls (mobile UI)
    this.makeTouchControls();

    // First-play hint overlay (touch users only)
    this.maybeShowFirstPlayHint();

    // HUD
    this.scene.launch('HUD', { islandId: this.island.id });

    // Music
    audio.resume();
    audio.playMusic(this.island.musicMood);

    // Welcome banner
    this.showIslandBanner();

    trackEvent({ type: 'level_start', island: this.island.id });
  }

  private buildBackground(): void {
    const sky = this.add.graphics().setDepth(0);
    const top = Phaser.Display.Color.HexStringToColor(this.island.palette.sky[0]).color;
    const bot = Phaser.Display.Color.HexStringToColor(this.island.palette.sky[1]).color;
    sky.fillGradientStyle(top, top, bot, bot, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sun
    const sun = this.add.image(GAME_WIDTH * 0.78, GAME_HEIGHT * 0.22, 'bg_sun').setScale(1.4).setAlpha(0.85).setDepth(1);
    this.tweens.add({ targets: sun, scale: 1.55, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Far layer: mountains
    const mountains = this.add.tileSprite(0, GAME_HEIGHT - 280, GAME_WIDTH, 140, 'bg_mountain').setOrigin(0, 0).setDepth(2);
    mountains.setTint(Phaser.Display.Color.HexStringToColor(this.island.palette.foliage).color);
    mountains.setAlpha(0.65);
    this.bgLayers.push({ sprite: mountains, speed: 0.15 });

    // Mid layer: islands
    const islands = this.add.tileSprite(0, GAME_HEIGHT - 200, GAME_WIDTH, 60, 'bg_island').setOrigin(0, 0).setDepth(3);
    islands.setAlpha(0.85);
    this.bgLayers.push({ sprite: islands, speed: 0.35 });

    // Near layer: palms repeating
    const palmStrip = this.makePalmStrip();
    const palms = this.add.tileSprite(0, GROUND_Y - 180, GAME_WIDTH, 180, palmStrip).setOrigin(0, 0).setDepth(4);
    this.bgLayers.push({ sprite: palms, speed: 0.7 });

    // Sea sliver
    const sea = this.add.rectangle(0, GAME_HEIGHT - 200, GAME_WIDTH, 120, Phaser.Display.Color.HexStringToColor(this.island.palette.sea).color)
      .setOrigin(0).setDepth(2);
    sea.setAlpha(0.7);
  }

  private makePalmStrip(): string {
    const key = `palmstrip_${this.island.id}`;
    if (this.textures.exists(key)) return key;
    const w = 480, h = 180;
    const g = this.add.graphics({ x: 0, y: 0 });
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x6b3a1a, 1);
      g.fillRoundedRect(40 + i * 110, 70, 12, 110, 4);
      g.fillStyle(0x2e8b57, 1);
      const cx = 46 + i * 110;
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        g.fillEllipse(cx + Math.cos(a) * 22, 60 + Math.sin(a) * 14, 60, 18);
      }
      g.fillStyle(0x3a9a66, 1);
      g.fillCircle(cx, 66, 14);
    }
    g.generateTexture(key, w, h);
    g.destroy();
    return key;
  }

  private makeTouchControls(): void {
    const showButtons = isTouchDevice() || isMobileViewport();
    if (!showButtons) return;

    const mobile = isMobileViewport();
    const size = mobile ? 110 : 80;
    const radius = size / 2;
    const margin = 28;
    const yPos = GAME_HEIGHT - radius - margin;
    const alpha = 0.7;

    // ── Slide button (lower left) ───────────────────────────────────
    const slideX = radius + margin;
    const slideBtn = this.add.circle(slideX, yPos, radius, 0xffffff, alpha * 0.35)
      .setStrokeStyle(3, 0xfff7e8, alpha)
      .setDepth(100)
      .setScrollFactor(0);
    const slideHit = new Phaser.Geom.Rectangle(-radius - 10, -radius - 10, size + 20, size + 20);
    slideBtn.setInteractive({
      hitArea: slideHit,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    const slideIcon = this.add.text(slideX, yPos, '▼', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: mobile ? '44px' : '32px',
      color: '#fff7e8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0).setAlpha(alpha + 0.2);
    slideBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      this.startSlide();
      this.dismissHint();
      ev?.stopPropagation?.();
    });
    this.touchButtonZones.push(new Phaser.Geom.Rectangle(slideX - radius - 10, yPos - radius - 10, size + 20, size + 20));
    void slideIcon;

    // ── Jump button (lower right) ───────────────────────────────────
    const jumpX = GAME_WIDTH - radius - margin;
    const jumpBtn = this.add.circle(jumpX, yPos, radius, 0xffffff, alpha * 0.35)
      .setStrokeStyle(3, 0xfff7e8, alpha)
      .setDepth(100)
      .setScrollFactor(0);
    const jumpHit = new Phaser.Geom.Rectangle(-radius - 10, -radius - 10, size + 20, size + 20);
    jumpBtn.setInteractive({
      hitArea: jumpHit,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    const jumpIcon = this.add.text(jumpX, yPos, '▲', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: mobile ? '44px' : '32px',
      color: '#fff7e8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0).setAlpha(alpha + 0.2);
    jumpBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      this.tryJump();
      this.dismissHint();
      ev?.stopPropagation?.();
    });
    this.touchButtonZones.push(new Phaser.Geom.Rectangle(jumpX - radius - 10, yPos - radius - 10, size + 20, size + 20));
    void jumpIcon;

    // ── Pause button (upper right, touch only) ──────────────────────
    if (isTouchDevice()) {
      const pauseSize = 60;
      const pauseX = GAME_WIDTH - pauseSize / 2 - 12;
      const pauseY = pauseSize / 2 + 56; // below HUD top bar (50px)
      const pauseBtn = this.add.circle(pauseX, pauseY, pauseSize / 2, 0x000000, 0.45)
        .setStrokeStyle(2, 0xfff7e8, 0.8)
        .setDepth(100)
        .setScrollFactor(0);
      const pauseHit = new Phaser.Geom.Rectangle(-pauseSize / 2 - 6, -pauseSize / 2 - 6, pauseSize + 12, pauseSize + 12);
      pauseBtn.setInteractive({
        hitArea: pauseHit,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      this.add.text(pauseX, pauseY, '⏸', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '28px',
        color: '#fff7e8',
      }).setOrigin(0.5).setDepth(101).setScrollFactor(0);
      pauseBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        this.togglePause();
        ev?.stopPropagation?.();
      });
      this.touchButtonZones.push(new Phaser.Geom.Rectangle(pauseX - pauseSize / 2 - 6, pauseY - pauseSize / 2 - 6, pauseSize + 12, pauseSize + 12));
    }
  }

  private maybeShowFirstPlayHint(): void {
    if (!(isTouchDevice() || isMobileViewport())) return;
    if (this.registry.get('hintShown')) return;
    this.registry.set('hintShown', true);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const c = this.add.container(cx, cy).setDepth(450).setScrollFactor(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a3d4f, 0.82);
    bg.fillRoundedRect(-260, -70, 520, 140, 16);
    bg.lineStyle(2, 0xffd166, 0.9);
    bg.strokeRoundedRect(-260, -70, 520, 140, 16);
    const txt = this.add.text(0, 0, '👆 Touche en haut pour SAUTER\n👇 Touche en bas pour GLISSER', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '22px',
      color: '#fff7e8',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add([bg, txt]);
    this.hintOverlay = c;

    // Auto-fade after 3s
    this.time.delayedCall(3000, () => this.dismissHint());
  }

  private dismissHint(): void {
    if (!this.hintOverlay) return;
    const overlay = this.hintOverlay;
    this.hintOverlay = undefined;
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 350,
      onComplete: () => overlay.destroy(),
    });
  }

  private showIslandBanner(): void {
    const banner = this.add.container(GAME_WIDTH / 2, -80).setDepth(200);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a3d4f, 0.92);
    bg.fillRoundedRect(-220, -32, 440, 64, 12);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.island.palette.accent).color, 1);
    bg.strokeRoundedRect(-220, -32, 440, 64, 12);
    const txt = this.add.text(0, 0, `${this.island.flag}  ${this.island.name.toUpperCase()}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '24px',
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    banner.add([bg, txt]);
    this.tweens.add({
      targets: banner, y: 90, duration: 500, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({ targets: banner, y: -80, duration: 400, ease: 'Back.easeIn', onComplete: () => banner.destroy() });
        });
      },
    });
  }

  // ─── Update loop ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.isPaused || this.cinematicMode) return;

    const dt = delta;

    // Speed ramp
    const targetSpeed = Math.min(this.maxSpeed, 320 + this.distance / 30);
    const effectiveSpeed = time < this.boostUntil ? targetSpeed * 1.5 : targetSpeed;
    this.speed = effectiveSpeed;
    this.distance += (this.speed * dt) / 1000;

    // Score ticks (1 pt per 10 px)
    const distGain = (this.speed * dt) / 1000;
    const scoreGain = (distGain / 10) * (time < this.doubleScoreUntil ? 2 : 1);
    this.score += scoreGain;

    // Update HUD via registry
    this.registry.set('score', Math.floor(this.score));
    this.registry.set('distance', Math.floor(this.distance));
    this.registry.set('lives', this.lives);
    this.registry.set('combo', this.combo);
    this.registry.set('powerups', {
      magnet: Math.max(0, this.magnetUntil - time),
      boost: Math.max(0, this.boostUntil - time),
      invincible: Math.max(0, this.invincibleUntil - time),
      double: Math.max(0, this.doubleScoreUntil - time),
    });

    // Parallax
    for (const layer of this.bgLayers) {
      layer.sprite.tilePositionX += (this.speed * dt) / 1000 * layer.speed;
    }
    this.groundTile.tilePositionX += (this.speed * dt) / 1000;

    // Spawn obstacles
    this.spawnTimer -= dt;
    this.spawnInterval = Math.max(420, 900 - this.distance / 6);
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = this.spawnInterval * Phaser.Math.FloatBetween(0.7, 1.3);
    }

    // Spawn collectibles
    this.collectSpawnTimer -= dt;
    if (this.collectSpawnTimer <= 0) {
      this.spawnCollectibleRow();
      this.collectSpawnTimer = Phaser.Math.Between(1100, 1900);
    }

    // Spawn powerups (rare)
    this.powerupSpawnTimer -= dt;
    if (this.powerupSpawnTimer <= 0) {
      this.spawnPowerup();
      this.powerupSpawnTimer = Phaser.Math.Between(7000, 14000);
    }

    // Move groups left
    [this.obstacles, this.collectibles, this.powerups].forEach((group) => {
      group.children.each((child) => {
        const c = child as Phaser.Physics.Arcade.Sprite;
        c.x -= (this.speed * dt) / 1000;
        if (c.x < -80) c.destroy();
        return true;
      });
    });

    // Magnet effect
    if (time < this.magnetUntil) {
      this.collectibles.children.each((child) => {
        const c = child as Phaser.Physics.Arcade.Sprite;
        const dx = this.player.x - c.x;
        const dy = (this.player.y - 30) - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 250) {
          c.x += (dx / dist) * 8;
          c.y += (dy / dist) * 8;
        }
        return true;
      });
    }

    // Player physics
    this.updatePlayer(time, dt);

    // Combo timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Boss check
    if (this.bossPhase === 'none' && this.score >= this.bossTriggerScore) {
      this.startBossSequence();
    }
  }

  private updatePlayer(_time: number, dt: number): void {
    const body = this.pbody;
    const onGround = this.player.y >= GROUND_Y - 10 && body.velocity.y >= 0;

    if (onGround) {
      this.player.y = GROUND_Y - 10;
      body.setVelocityY(0);
      if (this.playerState === 'jump') {
        this.setPlayerState('run');
        this.jumpsLeft = this.maxJumps;
      }
    } else {
      // gravity
      body.setVelocityY(body.velocity.y + 0.04 * dt * 30);
    }

    if (this.playerState === 'slide') {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.setPlayerState('run');
    }
  }

  private setPlayerState(s: 'run' | 'jump' | 'slide' | 'hit'): void {
    if (this.playerState === s) return;
    this.playerState = s;
    if (s === 'run') {
      this.player.play('run', true);
      this.pbody.setSize(40, 80).setOffset(17, 16);
    } else if (s === 'jump') {
      this.player.anims.stop();
      this.player.setTexture('player_jump');
      this.pbody.setSize(40, 80).setOffset(17, 16);
    } else if (s === 'slide') {
      this.player.anims.stop();
      this.player.setTexture('player_slide');
      this.pbody.setSize(60, 36).setOffset(7, 60);
    } else if (s === 'hit') {
      this.player.setTexture('player_hit');
    }
  }

  private tryJump(): void {
    if (this.cinematicMode || this.isPaused) return;
    if (this.jumpsLeft <= 0) return;
    this.dismissHint();
    this.jumpsLeft -= 1;
    this.pbody.setVelocityY(-560);
    this.setPlayerState('jump');
    if (this.jumpsLeft === this.maxJumps - 1) audio.jump();
    else audio.doubleJump();
    // dust puff
    this.particles.setPosition(this.player.x, GROUND_Y - 4);
    this.particles.explode(8);
  }

  private startSlide(): void {
    if (this.cinematicMode || this.isPaused) return;
    if (this.playerState === 'jump') {
      // air slam to ground
      this.pbody.setVelocityY(900);
      return;
    }
    if (this.playerState !== 'run') return;
    this.dismissHint();
    this.setPlayerState('slide');
    this.slideTimer = 600;
    audio.slide();
    this.particles.setPosition(this.player.x - 20, GROUND_Y - 6);
    this.particles.explode(12);
  }

  // ─── Spawning ─────────────────────────────────────────────────────

  private spawnObstacle(): void {
    if (this.bossPhase === 'incoming' || this.bossPhase === 'active') return;
    const kinds = this.island.obstacleTypes;
    const kind = Phaser.Utils.Array.GetRandom(kinds) as ObstacleKind;
    const cfg = this.obstacleConfig(kind);
    const x = GAME_WIDTH + 60;
    const y = cfg.y;
    const sprite = this.physics.add.sprite(x, y, cfg.tex).setOrigin(0.5, 1);
    sprite.body.setSize(cfg.bodyW, cfg.bodyH).setOffset(cfg.bodyOX, cfg.bodyOY);
    sprite.body.setAllowGravity(false);
    sprite.setData('kind', kind);
    sprite.setDepth(10);
    this.obstacles.add(sprite);

    // Bobbing for parrots
    if (kind === 'parrot') {
      this.tweens.add({ targets: sprite, y: sprite.y - 14, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private obstacleConfig(kind: ObstacleKind): { tex: string; y: number; bodyW: number; bodyH: number; bodyOX: number; bodyOY: number } {
    switch (kind) {
      case 'crab': return { tex: 'obs_crab', y: GROUND_Y - 10, bodyW: 40, bodyH: 24, bodyOX: 2, bodyOY: 6 };
      case 'log': return { tex: 'obs_log', y: GROUND_Y - 10, bodyW: 76, bodyH: 22, bodyOX: 2, bodyOY: 4 };
      case 'wave': return { tex: 'obs_wave', y: GROUND_Y - 4, bodyW: 76, bodyH: 30, bodyOX: 2, bodyOY: 16 };
      case 'cactus': return { tex: 'obs_cactus', y: GROUND_Y - 10, bodyW: 30, bodyH: 56, bodyOX: 3, bodyOY: 2 };
      case 'barrel': return { tex: 'obs_barrel', y: GROUND_Y - 10, bodyW: 36, bodyH: 36, bodyOX: 2, bodyOY: 2 };
      case 'parrot': return { tex: 'obs_parrot', y: GROUND_Y - 130, bodyW: 40, bodyH: 28, bodyOX: 2, bodyOY: 2 };
    }
  }

  private spawnCollectibleRow(): void {
    const count = Phaser.Math.Between(3, 6);
    const startX = GAME_WIDTH + 60;
    const baseY = Phaser.Math.RND.pick([GROUND_Y - 30, GROUND_Y - 90, GROUND_Y - 150]);
    const tex = Phaser.Math.Between(0, 100) < 18 ? 'collect_bottle'
      : Phaser.Math.Between(0, 100) < 40 ? 'collect_cane'
      : 'collect_barrel';
    for (let i = 0; i < count; i++) {
      const x = startX + i * 36;
      const y = baseY - Math.sin((i / count) * Math.PI) * 16;
      const sprite = this.physics.add.sprite(x, y, tex).setOrigin(0.5);
      sprite.body.setAllowGravity(false);
      sprite.body.setCircle(14);
      sprite.setData('tex', tex);
      sprite.setDepth(11);
      this.tweens.add({ targets: sprite, y: y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.collectibles.add(sprite);
    }
    // Sometimes add a heart
    if (Phaser.Math.Between(0, 100) < 8 && this.lives < 4) {
      const heart = this.physics.add.sprite(startX + count * 36 + 60, GROUND_Y - 100, 'collect_heart').setOrigin(0.5);
      heart.body.setAllowGravity(false);
      heart.body.setCircle(14);
      heart.setData('tex', 'collect_heart');
      heart.setDepth(11);
      this.tweens.add({ targets: heart, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
      this.collectibles.add(heart);
    }
  }

  private spawnPowerup(): void {
    const types: { tex: string; pwr: Powerup }[] = [
      { tex: 'pwr_pearl', pwr: 'pearl' },
      { tex: 'pwr_magnet', pwr: 'magnet' },
      { tex: 'pwr_boost', pwr: 'boost' },
      { tex: 'pwr_double', pwr: 'double' },
    ];
    const choice = Phaser.Utils.Array.GetRandom(types) as { tex: string; pwr: Powerup };
    const sprite = this.physics.add.sprite(GAME_WIDTH + 60, GROUND_Y - 110, choice.tex).setOrigin(0.5);
    sprite.body.setAllowGravity(false);
    sprite.body.setCircle(16);
    sprite.setData('pwr', choice.pwr);
    sprite.setDepth(12);
    this.tweens.add({ targets: sprite, y: sprite.y - 8, duration: 500, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: sprite, scale: 1.2, duration: 700, yoyo: true, repeat: -1 });
    this.powerups.add(sprite);
  }

  // ─── Interactions ─────────────────────────────────────────────────

  private onCollect(c: Phaser.Physics.Arcade.Sprite): void {
    const tex = c.getData('tex') as string;
    const points = tex === 'collect_bottle' ? 100 : tex === 'collect_cane' ? 25 : tex === 'collect_heart' ? 0 : 50;
    if (tex === 'collect_heart') {
      this.lives = Math.min(4, this.lives + 1);
      audio.powerup();
    } else {
      this.combo += 1;
      this.comboTimer = 1500;
      const mult = Math.min(5, 1 + Math.floor(this.combo / 3));
      this.score += points * mult * (this.time.now < this.doubleScoreUntil ? 2 : 1);
      audio.collect();
      if (tex === 'collect_bottle' && !state.mute) vibrate([30, 50, 30]);
    }
    // Pop FX
    const pop = this.add.image(c.x, c.y, 'particle_star').setScale(0.6).setDepth(30);
    this.tweens.add({ targets: pop, scale: 1.6, alpha: 0, duration: 350, onComplete: () => pop.destroy() });
    c.destroy();
  }

  private onHitObstacle(o: Phaser.Physics.Arcade.Sprite): void {
    if (this.time.now < this.invincibleUntil) return;
    o.destroy();
    this.lives -= 1;
    audio.hit();
    if (!state.mute) vibrate(80);
    this.cameras.main.shake(180, 0.012);
    this.cameras.main.flash(120, 255, 60, 80);
    this.combo = 0;
    this.invincibleUntil = this.time.now + 1400;

    // Flash player
    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: 6,
      onComplete: () => this.player.setAlpha(1),
    });

    if (this.lives <= 0) this.die();
  }

  private onPowerup(p: Phaser.Physics.Arcade.Sprite): void {
    const pwr = p.getData('pwr') as Powerup;
    p.destroy();
    audio.powerup();
    this.cameras.main.flash(150, 255, 230, 120);
    const now = this.time.now;
    switch (pwr) {
      case 'pearl': this.invincibleUntil = now + 5000; break;
      case 'magnet': this.magnetUntil = now + 6000; break;
      case 'boost': this.boostUntil = now + 4000; break;
      case 'double': this.doubleScoreUntil = now + 8000; break;
    }
    // Floating label
    const labels: Record<Powerup, string> = {
      pearl: 'INVINCIBLE !',
      magnet: 'AIMANT !',
      boost: 'BOOST !',
      double: 'x2 SCORE !',
    };
    const t = this.add.text(this.player.x, this.player.y - 80, labels[pwr], {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffd166',
      fontStyle: 'bold',
      stroke: '#0a3d4f',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  // ─── Boss / End sequence ─────────────────────────────────────────

  private startBossSequence(): void {
    this.bossPhase = 'incoming';
    // Clear obstacles
    this.obstacles.clear(true, true);
    // Banner
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '🌋 DÉFI FINAL !', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '46px',
      color: '#ffd166',
      fontStyle: 'bold',
      stroke: '#0a3d4f',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);
    this.tweens.add({
      targets: banner, alpha: 1, scale: { from: 0.5, to: 1.1 }, duration: 500, yoyo: true,
      onComplete: () => {
        banner.destroy();
        this.bossPhase = 'active';
        this.runBossWaves();
      },
    });
  }

  private runBossWaves(): void {
    let wave = 0;
    const maxWaves = 5;
    const tick = (): void => {
      if (wave >= maxWaves) {
        this.bossPhase = 'done';
        this.completeLevel();
        return;
      }
      wave += 1;
      // Spawn dense pattern
      const startX = GAME_WIDTH + 40;
      const kinds = this.island.obstacleTypes;
      for (let i = 0; i < 3; i++) {
        const kind = Phaser.Utils.Array.GetRandom(kinds) as ObstacleKind;
        const cfg = this.obstacleConfig(kind);
        const sprite = this.physics.add.sprite(startX + i * 110, cfg.y, cfg.tex).setOrigin(0.5, 1);
        sprite.body.setSize(cfg.bodyW, cfg.bodyH).setOffset(cfg.bodyOX, cfg.bodyOY);
        sprite.body.setAllowGravity(false);
        sprite.setData('kind', kind);
        sprite.setDepth(10);
        this.obstacles.add(sprite);
      }
      // Bonus bottle reward
      const bottle = this.physics.add.sprite(startX + 350, GROUND_Y - 100, 'collect_bottle').setOrigin(0.5);
      bottle.body.setAllowGravity(false);
      bottle.body.setCircle(14);
      bottle.setData('tex', 'collect_bottle');
      bottle.setDepth(11);
      this.tweens.add({ targets: bottle, scale: 1.3, duration: 600, yoyo: true, repeat: -1 });
      this.collectibles.add(bottle);
      this.time.delayedCall(1300, tick);
    };
    tick();
  }

  private completeLevel(): void {
    this.cinematicMode = true;
    audio.victory();
    if (!state.mute) vibrate([30, 50, 30]);
    this.cameras.main.flash(400, 255, 220, 120);

    // Compute stars
    const stars = this.score >= 4000 ? 3 : this.score >= 2500 ? 2 : 1;
    state.setStarsForIsland(this.island.id, stars);

    // Unlock rum
    state.collectRum(this.island.id);

    // Unlock recipe
    const recipe = RECIPES.find((r) => r.unlockedAfterIsland === this.island.id);
    if (recipe) {
      state.unlockRecipe(recipe.id);
      trackEvent({ type: 'recipe_unlocked', name: recipe.name });
    }

    // Unlock next island
    const nextId = nextIsland(this.island.id);
    if (nextId) state.unlockIsland(nextId);

    trackEvent({ type: 'level_complete', island: this.island.id, score: Math.floor(this.score), stars });

    // Show level complete overlay
    this.time.delayedCall(800, () => this.showLevelCompleteOverlay(stars, recipe?.name));
  }

  private showLevelCompleteOverlay(stars: number, recipeName?: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a3d4f, 0.8).setOrigin(0).setDepth(300);
    void overlay;

    const panel = this.add.image(cx, cy, 'ui_panel').setDisplaySize(560, 360).setDepth(301);
    void panel;

    const title = this.add.text(cx, cy - 130, `${this.island.flag}  ${this.island.name} terminé !`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '28px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);
    void title;

    // Stars
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(cx - 60 + i * 60, cy - 70, 'ui_star').setScale(0).setDepth(302);
      if (i < stars) {
        this.tweens.add({ targets: star, scale: 1.5, duration: 300, delay: 200 + i * 200, ease: 'Back.easeOut' });
      } else {
        star.setTint(0x444444).setAlpha(0.5);
        this.tweens.add({ targets: star, scale: 1, duration: 200, delay: 200 + i * 200 });
      }
    }

    // Rum unlocked
    this.add.text(cx, cy - 10, `🥃 Rhum débloqué : ${this.island.rum.name}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '18px', color: '#fff7e8',
    }).setOrigin(0.5).setDepth(302);

    this.add.text(cx, cy + 18, this.island.rum.notes, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px', color: '#ffd166', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(302);

    if (recipeName) {
      this.add.text(cx, cy + 50, `🍹 Nouvelle recette : ${recipeName}`, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '14px', color: '#fff7e8',
      }).setOrigin(0.5).setDepth(302);
    }

    this.add.text(cx, cy + 80, `Score : ${Math.floor(this.score)}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '20px', color: '#fff7e8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);

    this.time.delayedCall(2200, () => {
      this.scene.stop('HUD');
      audio.stopMusic();
      this.scene.start('GameOver', { score: Math.floor(this.score), distance: Math.floor(this.distance), islandId: this.island.id, completed: true, stars });
    });
  }

  // ─── Death ────────────────────────────────────────────────────────

  private die(): void {
    if (this.cinematicMode) return;
    this.cinematicMode = true;
    audio.death();
    this.physics.world.timeScale = 3;
    this.cameras.main.shake(300, 0.018);

    this.pbody.setVelocityY(-300);
    this.tweens.add({
      targets: this.player,
      angle: 180,
      duration: 800,
      ease: 'Quad.easeIn',
    });

    state.maybeSetHighscore(Math.floor(this.score));

    this.time.delayedCall(1000, () => {
      this.scene.stop('HUD');
      audio.stopMusic();
      this.physics.world.timeScale = 1;
      trackEvent({ type: 'game_over', score: Math.floor(this.score), distance: Math.floor(this.distance), island: this.island.id });
      this.scene.start('GameOver', { score: Math.floor(this.score), distance: Math.floor(this.distance), islandId: this.island.id, completed: false, stars: 0 });
    });
  }

  // ─── Pause ───────────────────────────────────────────────────────

  private togglePause(): void {
    if (this.cinematicMode) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
      this.pauseOverlay();
    } else {
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.removePauseOverlay();
    }
  }

  private pauseOverlayObj?: Phaser.GameObjects.Container;

  private pauseOverlay(): void {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const c = this.add.container(0, 0).setDepth(500);
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
    const text = this.add.text(cx, cy, 'PAUSE\n(P pour reprendre)', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '32px', color: '#ffd166', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    c.add([bg, text]);
    this.pauseOverlayObj = c;
  }

  private removePauseOverlay(): void {
    this.pauseOverlayObj?.destroy();
    this.pauseOverlayObj = undefined;
  }
}
