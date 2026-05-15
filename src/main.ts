import Phaser from 'phaser';
import './styles.css';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MapScene } from './scenes/MapScene';
import { LevelScene } from './scenes/LevelScene';
import { HUDScene } from './scenes/HUDScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { RecipesScene } from './scenes/RecipesScene';
import { RetailersScene } from './scenes/RetailersScene';
import { OrientationScene } from './scenes/OrientationScene';
import { audio } from './systems/audio';
import { setupAnalytics } from './systems/analytics';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a3d4f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    expandParent: true,
  },
  input: {
    activePointers: 3,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [
    BootScene,
    MainMenuScene,
    MapScene,
    LevelScene,
    HUDScene,
    GameOverScene,
    LeaderboardScene,
    RecipesScene,
    RetailersScene,
    OrientationScene,
  ],
};

const game = new Phaser.Game(config);

// Auto-launch the persistent orientation overlay so it sits above all other scenes.
game.scene.start('Orientation');

// GA4 — no-op unless VITE_GA4_ID is set AND cookie consent is true.
setupAnalytics();

// Resume / unlock audio on the FIRST user interaction (mobile autoplay
// policy). On iOS the AudioContext must be created inside a gesture, so
// we listen on both pointerdown AND touchstart in the capture phase to
// guarantee we run in the same call stack as the gesture, even if Phaser
// stops propagation.
const unlockAudio = (): void => {
  audio.resume();
};
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
window.addEventListener('click', unlockAudio, { capture: true });

// Tab visibility: stop music cleanly when hidden, resume on return.
// iOS in particular suspends the AudioContext when the PWA goes into the
// app switcher or the screen locks; restoring the music here handles
// that case so the user always hears the right track.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspendForBackground();
  } else {
    audio.resume();
    audio.restoreFromBackground();
  }
});

export { game };
