import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { ISLANDS, ISLAND_ORDER, type IslandId } from '../data/islands';
import { makeTitle, makeSubtitle, makeButton, makeHomeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';

export class MapScene extends Phaser.Scene {
  private selectedId: IslandId = 'martinique';
  private detailsContainer?: Phaser.GameObjects.Container;

  constructor() { super('Map'); }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Sea background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x9be7ff, 0x9be7ff, 0x1ca7a3, 0x1ca7a3, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative wave pattern
    const waves = this.add.graphics();
    waves.fillStyle(0xffffff, 0.18);
    for (let y = 80; y < GAME_HEIGHT; y += 24) {
      for (let x = 0; x < GAME_WIDTH; x += 32) {
        waves.fillCircle(x + ((y / 4) % 32), y, 1.2);
      }
    }

    // Sun (moved to top-left so it doesn't clash with the home button)
    this.add.image(80, 60, 'bg_sun').setScale(1.0).setAlpha(0.55);

    // Title
    makeTitle(this, GAME_WIDTH / 2, 40, 'Carte du Voyage', 32);
    makeSubtitle(this, GAME_WIDTH / 2, 70, 'Suis la route du rhum, de la Caraïbe à l\'Amérique latine', 13, '#fff7e8');

    // Map area
    const mapX = 60;
    const mapY = 100;
    const mapW = GAME_WIDTH - 120;
    const mapH = GAME_HEIGHT - 220;
    const mapBg = this.add.graphics();
    mapBg.fillStyle(0x0a3d4f, 0.35);
    mapBg.fillRoundedRect(mapX, mapY, mapW, mapH, 16);
    mapBg.lineStyle(2, COLORS.gold, 0.8);
    mapBg.strokeRoundedRect(mapX, mapY, mapW, mapH, 16);

    // Compass / departure hint (top-left of map)
    this.add.text(mapX + 14, mapY + 10, '🧭 Départ', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px',
      color: '#ffd166',
      fontStyle: 'bold',
    });
    this.add.text(mapX + mapW - 14, mapY + 10, 'Arrivée 🏁', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px',
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    // Draw routes between islands as a smooth curved path
    const routeG = this.add.graphics();
    routeG.lineStyle(3, COLORS.cream, 0.55);
    for (let i = 0; i < ISLAND_ORDER.length - 1; i++) {
      const a = ISLANDS[ISLAND_ORDER[i]].mapPos;
      const b = ISLANDS[ISLAND_ORDER[i + 1]].mapPos;
      const ax = mapX + a.x * mapW;
      const ay = mapY + a.y * mapH;
      const bx = mapX + b.x * mapW;
      const by = mapY + b.y * mapH;
      this.drawDashedLine(routeG, ax, ay, bx, by, 10, 7);
    }

    // Islands markers
    ISLAND_ORDER.forEach((id, idx) => {
      const island = ISLANDS[id];
      const cx = mapX + island.mapPos.x * mapW;
      const cy = mapY + island.mapPos.y * mapH;
      const unlocked = state.isUnlocked(id);

      const ringColor = unlocked ? COLORS.gold : 0x666666;
      const fillColor = unlocked ? Phaser.Display.Color.HexStringToColor(island.palette.foliage).color : 0x444444;

      const marker = this.add.container(cx, cy);

      const ring = this.add.circle(0, 0, 28, 0xffffff, 0).setStrokeStyle(3, ringColor, 1);
      const blob = this.add.circle(0, 0, 22, fillColor, unlocked ? 1 : 0.6);
      const flag = this.add.text(0, -2, island.flag, { fontSize: '22px' }).setOrigin(0.5);
      const label = this.add.text(0, 38, island.name, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '14px',
        color: unlocked ? '#fff7e8' : '#888888',
        fontStyle: 'bold',
        stroke: '#0a3d4f',
        strokeThickness: 3,
      }).setOrigin(0.5);

      // Step badge — small numbered chip on the upper-left of the marker
      const badgeBg = this.add.circle(-22, -22, 11, COLORS.deep, 0.95).setStrokeStyle(2, ringColor, 1);
      const badgeText = this.add.text(-22, -22, String(idx + 1), {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '12px',
        color: unlocked ? '#ffd166' : '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      marker.add([ring, blob, flag, label, badgeBg, badgeText]);

      if (state.hasRum(id)) {
        const star = this.add.image(22, -18, 'ui_star').setScale(0.7);
        marker.add(star);
      }
      if (!unlocked) {
        const lock = this.add.image(0, 0, 'ui_lock').setScale(0.8).setAlpha(0.85);
        marker.add(lock);
      }

      marker.setSize(72, 72);
      // 72×72 hit area gives plenty of touch margin even though the visual
      // marker is ~56px wide.
      marker.setInteractive(new Phaser.Geom.Rectangle(-36, -36, 72, 72), Phaser.Geom.Rectangle.Contains);
      marker.input!.cursor = unlocked ? 'pointer' : 'not-allowed';

      // Pulse animation for selected
      this.tweens.add({
        targets: ring,
        scale: 1.15,
        alpha: { from: 1, to: 0.4 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        paused: true,
      });

      marker.on('pointerover', () => {
        if (unlocked) this.tweens.add({ targets: marker, scale: 1.15, duration: 150 });
      });
      marker.on('pointerout', () => {
        this.tweens.add({ targets: marker, scale: 1, duration: 150 });
      });
      marker.on('pointerdown', () => {
        audio.click();
        this.selectIsland(id);
      });
    });

    // Details panel (right side)
    this.detailsContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 90);
    this.renderDetails();

    // Home button (top-right, consistent across navigable scenes)
    makeHomeButton(this, () => this.goMenu());

    audio.resume();
    audio.playMusic('menu');
  }

  private drawDashedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dash: number, gap: number): void {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let drawn = 0;
    while (drawn < len) {
      const nx1 = x1 + ux * drawn;
      const ny1 = y1 + uy * drawn;
      const nx2 = x1 + ux * Math.min(drawn + dash, len);
      const ny2 = y1 + uy * Math.min(drawn + dash, len);
      g.beginPath();
      g.moveTo(nx1, ny1);
      g.lineTo(nx2, ny2);
      g.strokePath();
      drawn += dash + gap;
    }
  }

  private selectIsland(id: IslandId): void {
    if (!state.isUnlocked(id)) {
      const island = ISLANDS[id];
      this.cameras.main.shake(120, 0.005);
      this.flashMsg(`🔒 Atteins ${island.unlockScore} pts pour débloquer !`);
      return;
    }
    this.selectedId = id;
    this.renderDetails();
  }

  private renderDetails(): void {
    if (!this.detailsContainer) return;
    this.detailsContainer.removeAll(true);

    const island = ISLANDS[this.selectedId];
    const w = GAME_WIDTH - 120;
    const h = 110;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a3d4f, 0.85);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(island.palette.accent).color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const title = this.add.text(-w / 2 + 20, -h / 2 + 14, `${island.flag} ${island.name}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '22px',
      color: '#fff7e8',
      fontStyle: 'bold',
    });

    const region = this.add.text(-w / 2 + 20, -h / 2 + 44, island.region, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffd166',
    });

    const desc = this.add.text(-w / 2 + 20, -h / 2 + 64, island.shortDescription, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px',
      color: '#fff7e8',
      wordWrap: { width: w - 220 },
    });

    const stars = state.starsForIsland(island.id);
    const starsText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const starsLabel = this.add.text(-w / 2 + 20, -h / 2 + h - 26, starsText, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffd166',
    });

    const playBtn = makeButton(this, w / 2 - 100, 0, '▶ JOUER', {
      width: 160, height: 50, fontSize: 18, variant: 'primary',
      onClick: () => this.startLevel(island.id),
    });

    this.detailsContainer.add([bg, title, region, desc, starsLabel, playBtn]);
  }

  private flashMsg(text: string): void {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, text, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffd166',
      fontStyle: 'bold',
      backgroundColor: '#0a3d4f',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: t.y - 20,
      duration: 200,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
      },
    });
  }

  private startLevel(id: IslandId): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('Level', { islandId: id });
    });
  }

  private goMenu(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('MainMenu');
    });
  }
}
