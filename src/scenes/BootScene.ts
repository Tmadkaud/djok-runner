import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BRAND } from '../config';
import { generateAllTextures } from '../systems/textures';
import { makeTitle, makeSubtitle, makeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';
import { trackEvent } from '../systems/analytics';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    generateAllTextures(this);
    this.load.image('opp_logo', 'opportune-logo.png');
  }

  create(): void {
    if (state.ageStatus === 'verified') {
      this.scene.start('MainMenu');
      return;
    }

    if (state.ageStatus === 'denied') {
      this.showDenied();
      return;
    }

    this.showAgeGate();
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.deep).setOrigin(0);
    this.add.image(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.2, 'bg_sun').setScale(1.6).setAlpha(0.6);
    this.add.image(120, GAME_HEIGHT - 60, 'bg_palm').setScale(0.6).setAlpha(0.4);
    this.add.image(GAME_WIDTH - 120, GAME_HEIGHT - 60, 'bg_palm').setScale(0.6).setAlpha(0.4).setFlipX(true);
    makeTitle(this, GAME_WIDTH / 2, 80, BRAND.name, 40);
    makeSubtitle(this, GAME_WIDTH / 2, 118, BRAND.tagline, 14, '#ffd166');
  }

  private showAgeGate(): void {
    this.drawBackdrop();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 20;

    this.add.image(cx, cy, 'ui_panel').setDisplaySize(560, 240).setTint(0x0a3d4f);

    makeTitle(this, cx, cy - 80, 'Avant de jouer', 26);
    makeSubtitle(
      this,
      cx,
      cy - 30,
      "Ce contenu est destiné à un public majeur.\nL'abus d'alcool est dangereux pour la santé, à consommer avec modération.",
      14,
      '#fff7e8',
    );

    makeButton(this, cx - 130, cy + 60, "J'ai 18 ans ou plus", {
      width: 240,
      height: 56,
      fontSize: 18,
      variant: 'primary',
      onClick: () => {
        state.setAgeStatus('verified');
        trackEvent({ type: 'age_gate_pass', age: 18 });
        audio.click();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenu'));
      },
    });

    makeButton(this, cx + 130, cy + 60, 'Non', {
      width: 200,
      height: 56,
      fontSize: 18,
      variant: 'ghost',
      onClick: () => {
        state.setAgeStatus('denied');
        trackEvent({ type: 'age_gate_fail' });
        this.scene.restart();
      },
    });
  }

  private showDenied(): void {
    this.drawBackdrop();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 20;
    this.add.image(cx, cy, 'ui_panel').setDisplaySize(560, 220).setTint(0x0a3d4f);
    makeTitle(this, cx, cy - 50, 'Accès refusé', 26);
    makeSubtitle(
      this,
      cx,
      cy + 10,
      "Ce contenu est réservé aux personnes majeures.\nL'abus d'alcool est dangereux pour la santé.",
      14,
      '#fff7e8',
    );
  }
}
