import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { ISLANDS, ISLAND_ORDER } from '../data/islands';
import { makeTitle, makeSubtitle, makeButton, makeHomeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0a3d4f, 0x0a3d4f, 0x051820, 0x051820, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    makeTitle(this, GAME_WIDTH / 2, 50, '🏆 Classement', 32);
    makeSubtitle(this, GAME_WIDTH / 2, 80, `Meilleur score : ${state.highscore}`, 16, '#ffd166');

    // Per-island stars
    const cx = GAME_WIDTH / 2;
    const startY = 130;
    const rowH = 50;

    ISLAND_ORDER.forEach((id, i) => {
      const island = ISLANDS[id];
      const y = startY + i * rowH;
      const stars = state.starsForIsland(id);
      const unlocked = state.isUnlocked(id);
      const hasRum = state.hasRum(id);

      const row = this.add.graphics();
      row.fillStyle(0xffffff, unlocked ? 0.08 : 0.03);
      row.fillRoundedRect(cx - 320, y - 20, 640, 40, 8);

      this.add.text(cx - 300, y, `${island.flag} ${island.name}`, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '18px',
        color: unlocked ? '#fff7e8' : '#888',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      this.add.text(cx - 80, y, hasRum ? `🥃 ${island.rum.name}` : 'Rhum verrouillé', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '13px',
        color: hasRum ? '#ffd166' : '#666',
      }).setOrigin(0, 0.5);

      const starsText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add.text(cx + 280, y, starsText, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffd166',
      }).setOrigin(1, 0.5);
    });

    // Total stats
    const totalStars = ISLAND_ORDER.reduce((s, id) => s + state.starsForIsland(id), 0);
    const totalRums = state.collectedRums.length;
    const sumY = startY + ISLAND_ORDER.length * rowH + 20;

    this.add.text(cx, sumY,
      `${totalStars} / ${ISLAND_ORDER.length * 3} étoiles  •  ${totalRums} / ${ISLAND_ORDER.length} rhums collectés`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (totalStars === ISLAND_ORDER.length * 3) {
      const congrats = this.add.text(cx, sumY + 24, '🌟 Maître Djok ! Tu as tout débloqué.', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '14px',
        color: '#e94f8a',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tweens.add({ targets: congrats, scale: 1.1, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    makeHomeButton(this, () => this.goBack());

    audio.resume();
    audio.playMusic('menu');

    void COLORS;
  }

  private goBack(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('MainMenu');
    });
  }
}
