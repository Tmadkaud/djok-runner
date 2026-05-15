import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../config';
import { ISLANDS, type IslandId } from '../data/islands';
import { state } from '../systems/state';
import { isMobileViewport, isTouchDevice, tryFullscreen } from '../systems/device';

interface HUDInit { islandId: IslandId; }

export class HUDScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private powerupContainer!: Phaser.GameObjects.Container;
  private currentLives = -1;
  private islandId: IslandId = 'martinique';
  private mobile = false;

  constructor() { super({ key: 'HUD', active: false }); }

  init(data: HUDInit): void {
    this.islandId = data?.islandId ?? 'martinique';
  }

  create(): void {
    const island = ISLANDS[this.islandId];
    this.mobile = isMobileViewport();
    const scale = this.mobile ? 1.25 : 1;
    const islandFs = Math.round(18 * scale);
    const scoreFs = Math.round(26 * scale);
    const distFs = Math.round(16 * scale);
    const topBarH = this.mobile ? 60 : 50;

    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.45);
    topBar.fillRect(0, 0, GAME_WIDTH, topBarH);

    // Island flag + name
    this.add.text(16, Math.round(topBarH / 2 - islandFs / 2 - 1), `${island.flag} ${island.name}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${islandFs}px`,
      color: '#ffd166',
      fontStyle: 'bold',
    });

    // Score
    this.scoreText = this.add.text(GAME_WIDTH / 2, Math.round(topBarH / 2 - scoreFs / 2 - 1), '0', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${scoreFs}px`,
      color: '#fff7e8',
      fontStyle: 'bold',
      stroke: '#0a3d4f',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    // Distance — left of right-side controls when on touch (fullscreen toggle)
    const fullscreenSlot = isTouchDevice() ? 44 : 0;
    this.distanceText = this.add.text(GAME_WIDTH - 16 - fullscreenSlot, Math.round(topBarH / 2 - distFs / 2 - 1), '0 m', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${distFs}px`,
      color: '#fff7e8',
    }).setOrigin(1, 0);

    // Combo (just below top bar)
    this.comboText = this.add.text(GAME_WIDTH / 2, topBarH, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: `${Math.round(20 * scale)}px`,
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0);

    // Lives
    this.livesContainer = this.add.container(20, topBarH + 10);

    // Powerups
    this.powerupContainer = this.add.container(GAME_WIDTH - 20, topBarH + 10);

    // Pause hint (desktop only)
    if (!isTouchDevice()) {
      this.add.text(GAME_WIDTH - 16, topBarH - 16, 'P : pause', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '11px',
        color: '#ccdde2',
      }).setOrigin(1, 0);
    }

    // Mute toggle — 40x40 hit area centered on emoji
    const muteX = 36;
    const muteY = topBarH + 28;
    const mute = this.add.text(muteX, muteY, state.mute ? '🔇' : '🔊', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: this.mobile ? '22px' : '20px',
    }).setOrigin(0.5);
    mute.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-20, -20, 40, 40),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    mute.on('pointerdown', () => {
      const newMute = state.toggleMute();
      mute.setText(newMute ? '🔇' : '🔊');
      this.events.emit('mute-changed', newMute);
    });

    // Fullscreen toggle (touch only)
    if (isTouchDevice()) {
      const fsX = GAME_WIDTH - 24;
      const fsY = Math.round(topBarH / 2);
      const fs = this.add.text(fsX, fsY, '📱', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '22px',
      }).setOrigin(0.5);
      fs.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-22, -22, 44, 44),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      fs.on('pointerdown', () => {
        tryFullscreen();
      });
    }
  }

  update(): void {
    const score = this.registry.get('score') ?? 0;
    const distance = this.registry.get('distance') ?? 0;
    const lives = this.registry.get('lives') ?? 0;
    const combo = this.registry.get('combo') ?? 0;

    this.scoreText.setText(String(score));
    this.distanceText.setText(`${distance} m`);

    if (combo > 1) {
      this.comboText.setText(`COMBO x${Math.min(5, 1 + Math.floor(combo / 3))}`);
      this.comboText.setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }

    if (lives !== this.currentLives) {
      this.currentLives = lives;
      this.livesContainer.removeAll(true);
      for (let i = 0; i < lives; i++) {
        const heart = this.add.image(i * 28, 0, 'collect_heart').setScale(0.9);
        this.livesContainer.add(heart);
      }
    }

    // Powerup timers
    const pwrs = (this.registry.get('powerups') ?? {}) as { magnet: number; boost: number; invincible: number; double: number };
    this.powerupContainer.removeAll(true);
    let off = 0;
    const badgeW = this.mobile ? 36 : 44;
    const badgeH = this.mobile ? 20 : 24;
    const badgeFs = this.mobile ? 10 : 11;
    const badgeStep = this.mobile ? 40 : 50;
    const drawPwr = (key: string, ms: number, color: number): void => {
      if (ms <= 0) return;
      const sec = Math.ceil(ms / 1000);
      const c = this.add.container(-off, 0);
      const bg = this.add.graphics();
      bg.fillStyle(color, 0.85);
      bg.fillRoundedRect(-badgeW, -badgeH / 2, badgeW, badgeH, 6);
      const t = this.add.text(-badgeW / 2, 0, `${key} ${sec}s`, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: `${badgeFs}px`, color: '#fff7e8', fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add([bg, t]);
      this.powerupContainer.add(c);
      off += badgeStep;
    };
    drawPwr('★', pwrs.invincible, COLORS.gold);
    drawPwr('⚡', pwrs.boost, COLORS.terracotta);
    drawPwr('🧲', pwrs.magnet, COLORS.fuchsia);
    drawPwr('x2', pwrs.double, COLORS.turquoise);
  }
}
