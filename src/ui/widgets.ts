import Phaser from 'phaser';
import { COLORS } from '../config';
import { audio } from '../systems/audio';
import { isTouchDevice } from '../systems/device';

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  variant?: 'primary' | 'alt' | 'ghost';
  disabled?: boolean;
  onClick: () => void;
}

// Apple HIG / Material both require a minimum 44–48 px tap target.
const MIN_TOUCH_SIZE = 48;
// Slightly larger buttons on touch devices for easier tapping.
const TOUCH_SCALE_BOOST = 1.1;

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: ButtonOpts,
): Phaser.GameObjects.Container {
  const w = opts.width ?? 240;
  const h = opts.height ?? 64;
  const fontSize = opts.fontSize ?? 22;
  const variant = opts.variant ?? 'primary';
  const disabled = opts.disabled ?? false;

  const fill =
    variant === 'primary' ? COLORS.fuchsia :
    variant === 'alt' ? COLORS.turquoise :
    COLORS.deep;

  const bg = scene.add.graphics();
  const drawBg = (alpha: number, scale: number): void => {
    bg.clear();
    if (variant === 'ghost') {
      bg.fillStyle(0xffffff, 0.08 + alpha * 0.08);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.lineStyle(2, COLORS.cream, 0.7 + alpha * 0.3);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    } else {
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      bg.fillStyle(0xffffff, 0.18);
      bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, (h - 8) * 0.4, 10);
    }
    bg.setScale(scale);
  };
  drawBg(0, 1);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Trebuchet MS, system-ui, sans-serif',
    fontSize: `${fontSize}px`,
    color: '#fff7e8',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  container.setSize(w, h);

  // Hit-area must always be at least MIN_TOUCH_SIZE on each axis; visual
  // size stays as requested. The rectangle is in the container's local
  // coordinate space so it scales with the container.
  const hitW = Math.max(w, MIN_TOUCH_SIZE);
  const hitH = Math.max(h, MIN_TOUCH_SIZE);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
    Phaser.Geom.Rectangle.Contains,
  );
  container.input!.cursor = disabled ? 'not-allowed' : 'pointer';

  // Touch devices get a small scale boost so the per-call sizes still work
  // but render slightly larger.
  const baseScale = isTouchDevice() ? TOUCH_SCALE_BOOST : 1;
  container.setScale(baseScale);

  if (disabled) {
    container.setAlpha(0.5);
    return container;
  }

  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: baseScale * 1.04, duration: 120, ease: 'Sine.easeOut' });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: baseScale, duration: 120 });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: baseScale * 0.96, duration: 60, yoyo: true });
    audio.click();
    audio.resume();
    opts.onClick();
  });

  return container;
}

export function makeTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 48,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: 'Trebuchet MS, system-ui, sans-serif',
    fontSize: `${size}px`,
    color: '#fff7e8',
    fontStyle: 'bold',
    stroke: '#0a3d4f',
    strokeThickness: 6,
    shadow: { offsetX: 2, offsetY: 4, color: '#000', blur: 6, fill: true },
  }).setOrigin(0.5);
}

export function makeSubtitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 18,
  color = '#fff7e8',
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: 'Trebuchet MS, system-ui, sans-serif',
    fontSize: `${size}px`,
    color,
    align: 'center',
  }).setOrigin(0.5);
}

export function fadeIn(scene: Phaser.Scene, duration = 400): void {
  const cam = scene.cameras.main;
  cam.fadeIn(duration, 0, 0, 0);
}

export function fadeOutThen(scene: Phaser.Scene, cb: () => void, duration = 400): void {
  const cam = scene.cameras.main;
  cam.fadeOut(duration, 0, 0, 0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, cb);
}

/**
 * Standard top-right home/menu button used across navigable scenes
 * (Map, Leaderboard, Recipes, Retailers). Always at GAME_WIDTH-30, 30,
 * 48×48 with a 🏠 icon. Sits on top of any scene background.
 */
export function makeHomeButton(
  scene: Phaser.Scene,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const w = scene.scale.width;
  const x = w - 36;
  const y = 36;
  const size = 48;

  const container = scene.add.container(x, y);
  container.setDepth(2000);
  container.setScrollFactor(0);

  const bg = scene.add.graphics();
  const drawBg = (alpha: number, scale: number): void => {
    bg.clear();
    bg.fillStyle(0x0a3d4f, 0.78);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(2, 0xffd166, 0.85 + alpha * 0.15);
    bg.strokeCircle(0, 0, size / 2);
    bg.setScale(scale);
  };
  drawBg(0, 1);

  const icon = scene.add.text(0, 1, '🏠', {
    fontFamily: 'Trebuchet MS, system-ui, sans-serif',
    fontSize: '22px',
  }).setOrigin(0.5);

  container.add([bg, icon]);
  container.setSize(size, size);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
    Phaser.Geom.Rectangle.Contains,
  );
  container.input!.cursor = 'pointer';

  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.08, duration: 120, ease: 'Sine.easeOut' });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 120 });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.92, duration: 60, yoyo: true });
    audio.click();
    audio.resume();
    onClick();
  });

  return container;
}
