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

// Resume audio on first user interaction (mobile autoplay policy)
const resumeAudio = (): void => {
  audio.resume();
};
window.addEventListener('pointerdown', resumeAudio, { once: false });
window.addEventListener('keydown', resumeAudio, { once: false });

// Tab visibility: pause music
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.stopMusic();
});

export { game };
