import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BRAND } from '../config';
import { makeTitle, makeSubtitle, makeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';
import { setupAnalytics } from '../systems/analytics';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const cam = this.cameras.main;
    cam.fadeIn(400, 0, 0, 0);

    // Background gradient (sky)
    const sky = this.add.graphics();
    sky.fillGradientStyle(0xff9a76, 0xff9a76, 0x1ca7a3, 0x1ca7a3, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sun
    const sun = this.add.image(GAME_WIDTH * 0.78, GAME_HEIGHT * 0.32, 'bg_sun').setScale(1.8).setAlpha(0.85);
    this.tweens.add({ targets: sun, scale: 2.0, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Distant clouds
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(40, 180), 'bg_cloud')
        .setScale(Phaser.Math.FloatBetween(0.5, 1))
        .setAlpha(0.7);
      this.tweens.add({ targets: cloud, x: cloud.x + 200, duration: Phaser.Math.Between(20000, 35000), repeat: -1, yoyo: true });
    }

    // Distant island
    this.add.image(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.55, 'bg_island').setScale(1.4).setAlpha(0.6);

    // Sea
    const sea = this.add.graphics();
    sea.fillStyle(0x1ca7a3, 1);
    sea.fillRect(0, GAME_HEIGHT * 0.62, GAME_WIDTH, GAME_HEIGHT * 0.4);
    sea.fillStyle(0x2bd4d0, 0.5);
    for (let y = GAME_HEIGHT * 0.62; y < GAME_HEIGHT; y += 14) {
      for (let x = 0; x < GAME_WIDTH; x += 24) {
        sea.fillCircle(x + ((y / 6) % 24), y, 2);
      }
    }

    // Sand foreground
    this.add.rectangle(0, GAME_HEIGHT - 70, GAME_WIDTH, 70, COLORS.sand).setOrigin(0);

    // Palms left + right
    this.add.image(80, GAME_HEIGHT - 90, 'bg_palm').setScale(0.85).setOrigin(0.5, 1);
    this.add.image(GAME_WIDTH - 80, GAME_HEIGHT - 90, 'bg_palm').setScale(0.85).setOrigin(0.5, 1).setFlipX(true);

    // Hibiscus decoration
    this.add.image(50, GAME_HEIGHT - 30, 'bg_hibiscus').setScale(0.7);
    this.add.image(GAME_WIDTH - 50, GAME_HEIGHT - 30, 'bg_hibiscus').setScale(0.7);

    // Player on title screen (idle bobbing)
    const player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 130, 'player_run_0').setScale(1.4);
    this.tweens.add({ targets: player, y: player.y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Title
    const title = makeTitle(this, GAME_WIDTH / 2, 100, 'DJOK RUNNER', 60);
    title.setShadow(2, 4, '#0a3d4f', 6, true, true);
    this.tweens.add({ targets: title, scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    makeSubtitle(this, GAME_WIDTH / 2, 150, BRAND.name + ' • ' + BRAND.tagline, 16, '#ffd166');

    // Buttons
    const bx = GAME_WIDTH / 2;
    let by = GAME_HEIGHT * 0.38;
    const gap = 58;

    makeButton(this, bx, by, '▶  JOUER', {
      width: 280, height: 60, fontSize: 26, variant: 'primary',
      onClick: () => this.go('Map'),
    });
    by += gap + 4;

    makeButton(this, bx, by, '🍹  Recettes', {
      width: 280, height: 46, fontSize: 18, variant: 'alt',
      onClick: () => this.go('Recipes'),
    });
    by += gap - 6;

    makeButton(this, bx, by, '🏆  Classement', {
      width: 280, height: 46, fontSize: 18, variant: 'alt',
      onClick: () => this.go('Leaderboard'),
    });
    by += gap - 6;

    makeButton(this, bx, by, '📍  Cavistes', {
      width: 280, height: 46, fontSize: 18, variant: 'alt',
      onClick: () => this.go('Retailers'),
    });

    // Mute toggle (top right)
    this.makeMuteToggle();

    // Credits link bottom
    const credits = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 8, '© Opportune 1791  •  À consommer avec modération', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '10px',
      color: '#fff7e8',
    }).setOrigin(0.5, 1).setAlpha(0.7);
    void credits;

    // Music
    audio.resume();
    audio.playMusic('menu');

    // Cookie consent (first time only)
    if (state.cookieConsent === null) {
      this.showCookieBanner();
    }
  }

  private makeMuteToggle(): void {
    const label = (): string => state.mute ? '🔇' : '🔊';
    const btn = makeButton(this, GAME_WIDTH - 38, 38, label(), {
      width: 50, height: 50, fontSize: 22, variant: 'ghost',
      onClick: () => {
        state.toggleMute();
        audio.applyMute();
        const text = btn.getAt(1) as Phaser.GameObjects.Text;
        text.setText(label());
      },
    });
  }

  private showCookieBanner(): void {
    const cx = GAME_WIDTH / 2;
    // Banner sits below the menu buttons (which end around y=394) and
    // above the credits line (y=GAME_HEIGHT-8).
    const banner = this.add.container(cx, GAME_HEIGHT - 70);
    const bw = 720, bh = 110;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
    bg.lineStyle(2, COLORS.gold, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
    const txt = this.add.text(-bw / 2 + 18, -bh / 2 + 10,
      'Ce site utilise des cookies pour améliorer ton expérience\net mesurer l\'audience. Tu peux les accepter ou les refuser.',
      { fontFamily: 'Trebuchet MS, system-ui, sans-serif', fontSize: '12px', color: '#fff7e8' });
    const accept = makeButton(this, 220, 22, 'Accepter', {
      width: 140, height: 48, fontSize: 15, variant: 'primary',
      onClick: () => { state.setCookieConsent(true); setupAnalytics(); banner.destroy(); },
    });
    const reject = makeButton(this, 70, 22, 'Refuser', {
      width: 130, height: 48, fontSize: 15, variant: 'ghost',
      onClick: () => { state.setCookieConsent(false); banner.destroy(); },
    });
    banner.add([bg, txt, accept, reject]);
  }

  private go(scene: string): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start(scene);
    });
  }
}
