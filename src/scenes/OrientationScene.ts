import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { isMobileViewport, onOrientationChange } from '../systems/device';

export class OrientationScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;
  private icon!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private iconTween?: Phaser.Tweens.Tween;
  private unsubscribe?: () => void;

  constructor() {
    super({ key: 'Orientation', active: false });
  }

  create(): void {
    this.bg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x051820,
      0.92,
    );

    this.icon = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, '📱', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '96px',
    }).setOrigin(0.5);

    this.title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40,
      'Tourne ton téléphone\npour jouer 🌴', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '36px',
        color: '#fff7e8',
        align: 'center',
        fontStyle: 'bold',
      }).setOrigin(0.5);

    this.subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130,
      'Mode paysage recommandé', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '18px',
        color: '#f4d2a4',
        align: 'center',
      }).setOrigin(0.5);

    this.overlay = this.add.container(0, 0, [this.bg, this.icon, this.title, this.subtitle]);
    this.overlay.setDepth(10000);
    this.overlay.setAlpha(0);
    this.overlay.setVisible(false);

    this.iconTween = this.tweens.add({
      targets: this.icon,
      angle: { from: -25, to: 25 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.scene.bringToTop('Orientation');

    this.unsubscribe = onOrientationChange((portrait) => {
      this.updateVisibility(portrait);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
      }
      if (this.iconTween) {
        this.iconTween.stop();
        this.iconTween = undefined;
      }
    });
  }

  private updateVisibility(portrait: boolean): void {
    if (!this.overlay) return;
    const shouldShow = portrait && isMobileViewport();
    if (shouldShow) {
      this.overlay.setVisible(true);
      this.overlay.setAlpha(1);
      this.scene.bringToTop('Orientation');
    } else {
      this.overlay.setAlpha(0);
      this.overlay.setVisible(false);
    }
  }
}
