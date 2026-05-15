import Phaser from 'phaser';

/**
 * Génère toutes les textures du jeu de manière procédurale (canvas).
 * Évite les assets externes pour un MVP autonome.
 */
export function generateAllTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('player_run_0')) return;
  generatePlayer(scene);
  generateCollectibles(scene);
  generateObstacles(scene);
  generatePowerups(scene);
  generateParticles(scene);
  generateUI(scene);
  generateBackgroundElements(scene);
}

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// ─── Player (Opportune) ───────────────────────────────────────────────

function drawOpportune(
  g: Phaser.GameObjects.Graphics,
  legOffset: number,
  armOffset: number,
  scarf: number,
): void {
  // Body shadow
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(36, 88, 38, 8);
  // Legs
  g.fillStyle(0x2a4d6e, 1); // pants navy
  g.fillRoundedRect(28, 64 + legOffset, 8, 22, 2);
  g.fillRoundedRect(40, 64 - legOffset, 8, 22, 2);
  // Shoes
  g.fillStyle(0x6b2f1a, 1);
  g.fillRoundedRect(26, 84 + legOffset, 12, 5, 2);
  g.fillRoundedRect(38, 84 - legOffset, 12, 5, 2);
  // Body / dress
  g.fillStyle(0xe94f8a, 1); // fuchsia
  g.fillRoundedRect(22, 38, 30, 30, 6);
  // Madras pattern stripes
  g.fillStyle(0xffd166, 0.55);
  g.fillRect(22, 46, 30, 3);
  g.fillRect(22, 56, 30, 3);
  g.fillStyle(0xfff7e8, 0.4);
  g.fillRect(28, 38, 3, 30);
  g.fillRect(40, 38, 3, 30);
  // Arms
  g.fillStyle(0x8b5a3c, 1); // skin
  g.fillRoundedRect(15, 42 + armOffset, 8, 22, 3);
  g.fillRoundedRect(50, 42 - armOffset, 8, 22, 3);
  // Neck
  g.fillStyle(0x8b5a3c, 1);
  g.fillRect(33, 30, 8, 10);
  // Head
  g.fillStyle(0x8b5a3c, 1);
  g.fillCircle(37, 22, 12);
  // Scarf (madras headwrap)
  g.fillStyle(0xffd166, 1);
  g.fillEllipse(37, 13, 26, 10);
  g.fillStyle(0xe94f8a, 1);
  g.fillTriangle(37 - 8, 10, 37 + 8 + scarf, 10, 37 + 6 + scarf, 4);
  g.fillStyle(0x2a4d6e, 1);
  g.fillRect(33, 12, 3, 4);
  g.fillRect(40, 12, 3, 4);
  // Eyes
  g.fillStyle(0x1a1a1a, 1);
  g.fillCircle(33, 23, 1.5);
  g.fillCircle(41, 23, 1.5);
  // Smile
  g.lineStyle(1.5, 0xff6680, 1);
  g.beginPath();
  g.arc(37, 27, 3, 0.1 * Math.PI, 0.9 * Math.PI);
  g.strokePath();
  // Earrings
  g.fillStyle(0xffd166, 1);
  g.fillCircle(26, 26, 1.5);
  g.fillCircle(48, 26, 1.5);
}

function generatePlayer(scene: Phaser.Scene): void {
  // Run cycle: 4 frames
  for (let i = 0; i < 4; i++) {
    const phase = (i / 4) * Math.PI * 2;
    const legOffset = Math.sin(phase) * 5;
    const armOffset = Math.sin(phase + Math.PI) * 4;
    makeTexture(scene, `player_run_${i}`, 74, 96, (g) => drawOpportune(g, legOffset, armOffset, 0));
  }
  // Jump
  makeTexture(scene, 'player_jump', 74, 96, (g) => drawOpportune(g, -3, -6, 4));
  // Slide (scrunched)
  makeTexture(scene, 'player_slide', 74, 96, (g) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(36, 88, 50, 8);
    g.fillStyle(0xe94f8a, 1);
    g.fillRoundedRect(15, 60, 50, 22, 8);
    g.fillStyle(0xffd166, 0.55);
    g.fillRect(15, 66, 50, 3);
    g.fillRect(15, 74, 50, 3);
    g.fillStyle(0x8b5a3c, 1);
    g.fillCircle(58, 60, 10);
    g.fillStyle(0xffd166, 1);
    g.fillEllipse(58, 53, 22, 8);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(60, 60, 1.5);
    g.fillCircle(54, 60, 1.5);
  });
  // Hit (red flash)
  makeTexture(scene, 'player_hit', 74, 96, (g) => {
    drawOpportune(g, 0, 0, 0);
  });
}

// ─── Collectibles ──────────────────────────────────────────────────────

function generateCollectibles(scene: Phaser.Scene): void {
  // Rum barrel
  makeTexture(scene, 'collect_barrel', 36, 36, (g) => {
    g.fillStyle(0x6b3a1a, 1);
    g.fillRoundedRect(4, 6, 28, 24, 4);
    g.fillStyle(0x4a2410, 1);
    g.fillRect(4, 10, 28, 2);
    g.fillRect(4, 24, 28, 2);
    g.fillStyle(0xffd166, 1);
    g.fillRect(4, 16, 28, 4);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(14, 17, 8, 2);
  });
  // Gold bottle
  makeTexture(scene, 'collect_bottle', 24, 40, (g) => {
    g.fillStyle(0xffd166, 1);
    g.fillRect(8, 4, 8, 8);
    g.fillStyle(0xa67c00, 1);
    g.fillRoundedRect(4, 12, 16, 24, 4);
    g.fillStyle(0xfff7e8, 0.6);
    g.fillRect(7, 16, 2, 16);
  });
  // Sugar cane
  makeTexture(scene, 'collect_cane', 28, 44, (g) => {
    g.fillStyle(0x6abf4a, 1);
    g.fillRoundedRect(11, 4, 6, 36, 2);
    g.fillStyle(0x4a8f30, 1);
    for (let y = 8; y < 38; y += 6) g.fillRect(11, y, 6, 1.5);
    g.fillStyle(0xa3d977, 1);
    g.fillTriangle(8, 4, 14, 4, 11, -2);
    g.fillTriangle(14, 4, 20, 4, 17, -2);
  });
  // Heart
  makeTexture(scene, 'collect_heart', 28, 28, (g) => {
    g.fillStyle(0xe94f8a, 1);
    g.fillCircle(9, 11, 6);
    g.fillCircle(19, 11, 6);
    g.fillTriangle(3, 13, 25, 13, 14, 26);
    g.fillStyle(0xfff7e8, 0.5);
    g.fillCircle(8, 9, 2);
  });
}

// ─── Obstacles ─────────────────────────────────────────────────────────

function generateObstacles(scene: Phaser.Scene): void {
  // Crab
  makeTexture(scene, 'obs_crab', 44, 32, (g) => {
    g.fillStyle(0xd84a3a, 1);
    g.fillEllipse(22, 20, 26, 16);
    g.fillStyle(0xa83020, 1);
    g.fillEllipse(22, 23, 26, 8);
    // Eyes
    g.fillStyle(0xfff7e8, 1);
    g.fillCircle(16, 12, 3);
    g.fillCircle(28, 12, 3);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(16, 12, 1.5);
    g.fillCircle(28, 12, 1.5);
    // Claws
    g.fillStyle(0xd84a3a, 1);
    g.fillCircle(4, 22, 4);
    g.fillCircle(40, 22, 4);
    // Legs
    g.lineStyle(2, 0xa83020, 1);
    [10, 14, 30, 34].forEach((x, i) => {
      g.beginPath();
      g.moveTo(x, 24);
      g.lineTo(x + (i % 2 === 0 ? -3 : 3), 30);
      g.strokePath();
    });
  });
  // Log
  makeTexture(scene, 'obs_log', 80, 28, (g) => {
    g.fillStyle(0x6b3a1a, 1);
    g.fillRoundedRect(0, 6, 80, 18, 8);
    g.fillStyle(0x4a2410, 1);
    for (let x = 8; x < 80; x += 12) g.fillRect(x, 8, 1, 14);
    g.fillStyle(0x8b5a3c, 1);
    g.fillCircle(4, 15, 6);
    g.fillCircle(76, 15, 6);
    g.fillStyle(0x4a2410, 1);
    g.fillCircle(4, 15, 2);
    g.fillCircle(76, 15, 2);
  });
  // Wave
  makeTexture(scene, 'obs_wave', 80, 50, (g) => {
    g.fillStyle(0x1ca7a3, 1);
    g.fillRect(0, 30, 80, 20);
    g.fillStyle(0x2bd4d0, 1);
    g.beginPath();
    g.moveTo(0, 30);
    for (let x = 0; x <= 80; x += 8) {
      g.lineTo(x, 30 - 10 - Math.sin(x * 0.2) * 6);
    }
    g.lineTo(80, 50);
    g.lineTo(0, 50);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xfff7e8, 0.85);
    for (let x = 0; x < 80; x += 14) g.fillCircle(x + 6, 14, 3);
  });
  // Cactus
  makeTexture(scene, 'obs_cactus', 36, 60, (g) => {
    g.fillStyle(0x4a8f3a, 1);
    g.fillRoundedRect(14, 8, 8, 50, 3);
    g.fillRoundedRect(4, 22, 8, 18, 3);
    g.fillRoundedRect(24, 16, 8, 22, 3);
    g.fillStyle(0x2e6b25, 1);
    g.fillRect(14, 8, 2, 50);
    g.fillStyle(0xfff7e8, 1);
    [20, 30, 40, 50].forEach((y) => g.fillCircle(18, y, 0.8));
  });
  // Barrel obstacle
  makeTexture(scene, 'obs_barrel', 40, 40, (g) => {
    g.fillStyle(0x4a2410, 1);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x8b5a3c, 1);
    g.fillCircle(20, 20, 14);
    g.fillStyle(0x4a2410, 1);
    g.fillRect(2, 18, 36, 4);
    g.fillStyle(0xa67c00, 1);
    g.fillRect(16, 12, 8, 16);
  });
  // Parrot
  makeTexture(scene, 'obs_parrot', 44, 32, (g) => {
    g.fillStyle(0xe53935, 1);
    g.fillEllipse(20, 16, 26, 18);
    g.fillStyle(0x1cae5e, 1);
    g.fillEllipse(28, 14, 12, 14);
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(38, 14, 44, 16, 38, 18);
    g.fillStyle(0xfff7e8, 1);
    g.fillCircle(34, 12, 2.5);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(34, 12, 1);
    g.fillStyle(0x2a7bd4, 1);
    g.fillTriangle(8, 14, 0, 18, 8, 22);
  });
}

// ─── Powerups ──────────────────────────────────────────────────────────

function generatePowerups(scene: Phaser.Scene): void {
  makeTexture(scene, 'pwr_pearl', 32, 32, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xb3e0ff, 1);
    g.fillCircle(16, 16, 9);
    g.fillStyle(0xfff7e8, 1);
    g.fillCircle(12, 12, 4);
  });
  makeTexture(scene, 'pwr_magnet', 32, 32, (g) => {
    g.fillStyle(0xe53935, 1);
    g.fillRect(4, 6, 8, 18);
    g.fillRect(20, 6, 8, 18);
    g.fillStyle(0xfff7e8, 1);
    g.fillRect(4, 6, 8, 4);
    g.fillRect(20, 6, 8, 4);
    g.fillStyle(0xe53935, 1);
    g.fillRect(4, 24, 24, 4);
  });
  makeTexture(scene, 'pwr_boost', 32, 32, (g) => {
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(6, 4, 26, 16, 6, 28);
    g.fillStyle(0xff7e62, 1);
    g.fillTriangle(14, 10, 22, 16, 14, 22);
  });
  makeTexture(scene, 'pwr_double', 32, 32, (g) => {
    g.fillStyle(0xe94f8a, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xfff7e8, 1);
    g.fillRect(8, 12, 16, 3);
    g.fillRect(8, 17, 16, 3);
  });
}

// ─── Particles ────────────────────────────────────────────────────────

function generateParticles(scene: Phaser.Scene): void {
  makeTexture(scene, 'particle_dot', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });
  makeTexture(scene, 'particle_star', 16, 16, (g) => {
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(8, 0, 11, 6, 16, 6);
    g.fillTriangle(8, 0, 5, 6, 0, 6);
    g.fillTriangle(8, 16, 11, 10, 16, 10);
    g.fillTriangle(8, 16, 5, 10, 0, 10);
    g.fillCircle(8, 8, 3);
  });
  makeTexture(scene, 'particle_sand', 6, 6, (g) => {
    g.fillStyle(0xf4d2a4, 1);
    g.fillRect(0, 0, 6, 6);
  });
}

// ─── UI ────────────────────────────────────────────────────────────────

function generateUI(scene: Phaser.Scene): void {
  makeTexture(scene, 'ui_pixel', 4, 4, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });
  makeTexture(scene, 'ui_button', 240, 60, (g) => {
    g.fillStyle(0xe94f8a, 1);
    g.fillRoundedRect(0, 0, 240, 60, 14);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(4, 4, 232, 24, 12);
  });
  makeTexture(scene, 'ui_button_alt', 240, 60, (g) => {
    g.fillStyle(0x15a3a3, 1);
    g.fillRoundedRect(0, 0, 240, 60, 14);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(4, 4, 232, 24, 12);
  });
  makeTexture(scene, 'ui_panel', 480, 320, (g) => {
    g.fillStyle(0x0a3d4f, 0.94);
    g.fillRoundedRect(0, 0, 480, 320, 18);
    g.lineStyle(3, 0xffd166, 1);
    g.strokeRoundedRect(0, 0, 480, 320, 18);
  });
  makeTexture(scene, 'ui_star', 28, 28, (g) => {
    g.fillStyle(0xffd166, 1);
    const cx = 14, cy = 14, r = 12, ri = 5;
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : ri;
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.fillPoints(
      pts.reduce<{ x: number; y: number }[]>((acc, _, i, arr) => {
        if (i % 2 === 0) acc.push({ x: arr[i], y: arr[i + 1] });
        return acc;
      }, []),
      true,
    );
  });
  makeTexture(scene, 'ui_lock', 24, 28, (g) => {
    g.fillStyle(0xfff7e8, 1);
    g.fillRoundedRect(2, 12, 20, 14, 3);
    g.lineStyle(3, 0xfff7e8, 1);
    g.strokeRoundedRect(6, 4, 12, 14, 4);
    g.fillStyle(0x0a3d4f, 1);
    g.fillCircle(12, 19, 2);
  });
}

// ─── Background elements ──────────────────────────────────────────────

function generateBackgroundElements(scene: Phaser.Scene): void {
  // Cloud
  makeTexture(scene, 'bg_cloud', 120, 50, (g) => {
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(30, 30, 22);
    g.fillCircle(60, 22, 26);
    g.fillCircle(90, 30, 22);
    g.fillEllipse(60, 38, 100, 18);
  });
  // Palm tree
  makeTexture(scene, 'bg_palm', 120, 180, (g) => {
    g.fillStyle(0x6b3a1a, 1);
    g.fillRoundedRect(54, 60, 12, 120, 4);
    g.fillStyle(0x5a2f15, 1);
    for (let y = 70; y < 180; y += 14) g.fillRect(54, y, 12, 2);
    g.fillStyle(0x2e8b57, 1);
    // 6 fronds
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = 60 + Math.cos(a) * 20;
      const y = 50 + Math.sin(a) * 12;
      g.fillEllipse(x, y, 60, 18);
    }
    g.fillStyle(0x3a9a66, 1);
    g.fillCircle(60, 56, 14);
    // Coconuts
    g.fillStyle(0x4a2410, 1);
    g.fillCircle(54, 64, 4);
    g.fillCircle(66, 64, 4);
  });
  // Mountain
  makeTexture(scene, 'bg_mountain', 300, 140, (g) => {
    g.fillStyle(0x3a5d6b, 1);
    g.fillTriangle(0, 140, 120, 10, 200, 140);
    g.fillStyle(0x4a6d7b, 1);
    g.fillTriangle(100, 140, 220, 30, 300, 140);
    g.fillStyle(0xfff7e8, 1);
    g.fillTriangle(105, 30, 120, 10, 135, 30);
    g.fillTriangle(210, 50, 220, 30, 230, 50);
  });
  // Distant island
  makeTexture(scene, 'bg_island', 200, 60, (g) => {
    g.fillStyle(0x4a8b6b, 1);
    g.fillEllipse(100, 40, 180, 32);
    g.fillStyle(0x3a6b5a, 1);
    g.fillEllipse(60, 30, 60, 20);
    g.fillEllipse(140, 26, 70, 22);
  });
  // Ground tile (sand)
  makeTexture(scene, 'bg_ground', 64, 80, (g) => {
    g.fillStyle(0xf4d2a4, 1);
    g.fillRect(0, 0, 64, 80);
    g.fillStyle(0xe6b87a, 1);
    g.fillRect(0, 0, 64, 6);
    g.fillStyle(0xd9a566, 0.6);
    for (let i = 0; i < 8; i++) {
      const x = (i * 7 + 3) % 64;
      const y = 12 + ((i * 11) % 60);
      g.fillCircle(x, y, 1.5);
    }
  });
  // Sun / moon
  makeTexture(scene, 'bg_sun', 80, 80, (g) => {
    g.fillStyle(0xffd166, 0.4);
    g.fillCircle(40, 40, 40);
    g.fillStyle(0xffd166, 0.7);
    g.fillCircle(40, 40, 30);
    g.fillStyle(0xffe89a, 1);
    g.fillCircle(40, 40, 22);
  });
  // Hibiscus flower (decoration)
  makeTexture(scene, 'bg_hibiscus', 40, 40, (g) => {
    g.fillStyle(0xe94f8a, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillCircle(20 + Math.cos(a) * 10, 20 + Math.sin(a) * 10, 8);
    }
    g.fillStyle(0xffd166, 1);
    g.fillCircle(20, 20, 5);
  });
}
