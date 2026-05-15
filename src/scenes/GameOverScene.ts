import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BRAND, COLORS } from '../config';
import { ISLANDS, type IslandId } from '../data/islands';
import { makeTitle, makeSubtitle, makeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';
import { trackEvent } from '../systems/analytics';
import { isMobileViewport } from '../systems/device';

interface GameOverData {
  score: number;
  distance: number;
  islandId: IslandId;
  completed: boolean;
  stars: number;
}

export class GameOverScene extends Phaser.Scene {
  private gameData!: GameOverData;
  private isHighscore = false;
  private generatedPromo: string | null = null;

  // HTML overlays + their reposition handlers, cleaned up on scene shutdown.
  private overlayElements: HTMLElement[] = [];
  private overlayResizeHandlers: Array<() => void> = [];

  constructor() { super('GameOver'); }

  init(data: GameOverData): void {
    this.gameData = data;
    this.isHighscore = data.score > state.highscore;
    state.maybeSetHighscore(data.score);
    this.generatedPromo = null;
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const island = ISLANDS[this.gameData.islandId];

    // Background
    const top = Phaser.Display.Color.HexStringToColor(island.palette.sky[0]).color;
    const bot = 0x0a3d4f;
    const sky = this.add.graphics();
    sky.fillGradientStyle(top, top, bot, bot, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.image(GAME_WIDTH * 0.85, 80, 'bg_sun').setScale(1.4).setAlpha(0.6);
    this.add.image(80, GAME_HEIGHT - 60, 'bg_palm').setScale(0.7).setAlpha(0.5);
    this.add.image(GAME_WIDTH - 80, GAME_HEIGHT - 60, 'bg_palm').setScale(0.7).setAlpha(0.5).setFlipX(true);

    // Brand logo (top-left)
    if (this.textures.exists('opp_logo')) {
      const logo = this.add.image(70, 56, 'opp_logo').setOrigin(0.5);
      const targetH = 70;
      logo.setScale(targetH / logo.height);
      logo.setDepth(10);
    }

    // Title
    const titleText = this.gameData.completed ? 'Île conquise !' : 'Game Over';
    makeTitle(this, GAME_WIDTH / 2, 50, titleText, 36);

    // Fireworks on victory
    if (this.gameData.completed) {
      this.launchFireworks();
    }

    // Score box
    const cx = GAME_WIDTH / 2;
    const boxY = 120;
    const box = this.add.graphics();
    box.fillStyle(0x0a3d4f, 0.9);
    box.fillRoundedRect(cx - 240, boxY, 480, 110, 14);
    box.lineStyle(2, COLORS.gold, 1);
    box.strokeRoundedRect(cx - 240, boxY, 480, 110, 14);

    this.add.text(cx, boxY + 14, 'SCORE', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(cx, boxY + 46, String(this.gameData.score), {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '46px', color: '#fff7e8', fontStyle: 'bold',
    }).setOrigin(0.5);
    void scoreLabel;

    this.add.text(cx, boxY + 86, `${this.gameData.distance} m parcourus  •  Meilleur score : ${state.highscore}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px', color: '#ccdde2',
    }).setOrigin(0.5);

    if (this.isHighscore) {
      const hs = this.add.text(cx, boxY + 110, '★ NOUVEAU RECORD ! ★', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '16px', color: '#ffd166', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tweens.add({ targets: hs, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // 3 CTAs
    const ctaY = 290;
    const gap = 220;

    // CTA 1: Save score (email)
    makeButton(this, cx - gap, ctaY, '💌 Sauver mon score', {
      width: 200, height: 56, fontSize: 14, variant: 'alt',
      onClick: () => this.openEmailModal(),
    });
    this.add.text(cx - gap, ctaY + 40, '+ vie bonus & recettes', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px', color: '#ccdde2',
    }).setOrigin(0.5);

    // CTA 2: Share
    makeButton(this, cx, ctaY, '📣 Partager', {
      width: 200, height: 56, fontSize: 14, variant: 'primary',
      onClick: () => this.openShareModal(),
    });
    this.add.text(cx, ctaY + 40, 'défier des amis', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px', color: '#ccdde2',
    }).setOrigin(0.5);

    // CTA 3: Promo code
    makeButton(this, cx + gap, ctaY, '🎁 -10% Opportune', {
      width: 200, height: 56, fontSize: 14, variant: 'alt',
      onClick: () => this.openPromoModal(),
    });
    this.add.text(cx + gap, ctaY + 40, 'sur l\'e-shop / cavistes', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px', color: '#ccdde2',
    }).setOrigin(0.5);

    // Bottom buttons (touch-friendly heights)
    const bottomY = GAME_HEIGHT - 50;
    makeButton(this, cx - 130, bottomY, '🔁 Rejouer', {
      width: 170, height: 48, fontSize: 16, variant: 'primary',
      onClick: () => this.replay(),
    });
    makeButton(this, cx + 60, bottomY, '🗺️ Carte', {
      width: 140, height: 48, fontSize: 16, variant: 'alt',
      onClick: () => this.goMap(),
    });
    makeButton(this, cx + 200, bottomY, '🏠', {
      width: 60, height: 48, fontSize: 18, variant: 'ghost',
      onClick: () => this.goMenu(),
    });

    audio.resume();
    audio.playMusic('menu');

    // Clean up any HTML overlays + listeners on scene shutdown / destroy.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupOverlays());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupOverlays());
  }

  // ─── Email modal ───

  private openEmailModal(): void {
    audio.click();
    const overlay = this.modalOverlay();
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const panel = this.add.image(cx, cy, 'ui_panel').setDisplaySize(560, 320).setDepth(1001);
    void panel;

    this.add.text(cx, cy - 130, '💌 Garde ton score', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '24px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(cx, cy - 90,
      "Reçois une vie bonus, les recettes secrètes\net les nouveautés Opportune 1791.",
      { fontFamily: 'Trebuchet MS, system-ui, sans-serif', fontSize: '13px', color: '#fff7e8', align: 'center' })
      .setOrigin(0.5).setDepth(1002);

    // HTML <input> overlay. Real input gives native validation + iOS keyboard.
    // font-size 16px prevents iOS auto-zoom on focus; height 48 is the
    // recommended minimum tap target.
    const input = document.createElement('input');
    input.type = 'email';
    input.placeholder = 'ton.email@exemple.fr';
    input.value = state.email ?? '';
    input.style.cssText = `
      position: fixed;
      z-index: 9999;
      padding: 10px 14px;
      font-size: 16px;
      border-radius: 10px;
      border: 2px solid #ffd166;
      background: #fff7e8;
      color: #0a3d4f;
      font-family: 'Trebuchet MS', sans-serif;
      outline: none;
      box-sizing: border-box;
      transform: none;
    `;
    document.body.appendChild(input);

    // Position the input over the panel, full panel width minus padding,
    // and reposition whenever the canvas/viewport changes.
    const inputW = 480;          // panel inner width (panel is 560, 40px padding each side)
    const inputH = 48;           // ≥48 for touch
    const inputSceneCenterY = cy - 20;
    const reposition = (): void => {
      this.positionOverlay(input, cx - inputW / 2, inputSceneCenterY - inputH / 2, inputW, inputH);
    };
    reposition();
    window.addEventListener('resize', reposition);
    this.scale.on(Phaser.Scale.Events.RESIZE, reposition);
    this.overlayElements.push(input);
    this.overlayResizeHandlers.push(reposition);

    setTimeout(() => input.focus(), 100);

    const status = this.add.text(cx, cy + 60, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px', color: '#ffd166',
    }).setOrigin(0.5).setDepth(1002);

    const cleanupInput = (): void => {
      window.removeEventListener('resize', reposition);
      this.scale.off(Phaser.Scale.Events.RESIZE, reposition);
      this.overlayResizeHandlers = this.overlayResizeHandlers.filter((h) => h !== reposition);
      this.overlayElements = this.overlayElements.filter((el) => el !== input);
      input.remove();
    };

    const submit = makeButton(this, cx - 90, cy + 110, 'OK', {
      width: 160, height: 48, fontSize: 16, variant: 'primary',
      onClick: () => {
        const v = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          status.setText('⚠️ E-mail invalide');
          return;
        }
        state.setEmail(v);
        trackEvent({ type: 'email_submit', source: 'game_over' });
        status.setText('✓ Merci ! Vie bonus débloquée.');
        input.disabled = true;
        audio.victory();
        setTimeout(() => {
          cleanupInput();
          this.closeModal(overlay, []);
        }, 1200);
      },
    });
    submit.setDepth(1003);

    const cancel = makeButton(this, cx + 90, cy + 110, 'Annuler', {
      width: 160, height: 48, fontSize: 14, variant: 'ghost',
      onClick: () => {
        cleanupInput();
        this.closeModal(overlay, [submit, cancel, status]);
      },
    });
    cancel.setDepth(1003);

    // RGPD note
    this.add.text(cx, cy + 150,
      'En validant, tu acceptes de recevoir nos communications. Désabonnement en 1 clic.',
      { fontFamily: 'Trebuchet MS, system-ui, sans-serif', fontSize: '10px', color: '#aaa' })
      .setOrigin(0.5).setDepth(1002);
  }

  // ─── Share modal ───

  private openShareModal(): void {
    audio.click();

    const shareText = `J'ai fait ${this.gameData.score} pts sur Djok Runner ${ISLANDS[this.gameData.islandId].flag} ${ISLANDS[this.gameData.islandId].name} ! Tu peux me battre ? 🥃 ${BRAND.url}`;

    // Native share API (mobile, secure context). Falls back to the network
    // chooser modal below if unavailable or the user dismisses it.
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      nav.share({ title: 'Djok Runner', text: shareText, url: BRAND.url })
        .then(() => trackEvent({ type: 'share_click', network: 'native' }))
        .catch(() => undefined);
      return;
    }

    const overlay = this.modalOverlay();
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const panel = this.add.image(cx, cy, 'ui_panel').setDisplaySize(560, 360).setDepth(1001);
    void panel;

    this.add.text(cx, cy - 150, '📣 Partage ton run', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '24px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1002);

    // Generate a share image preview
    const shareCard = this.makeShareCard();
    const cardImg = this.add.image(cx, cy - 30, shareCard).setDisplaySize(360, 180).setDepth(1002);
    void cardImg;

    const networks: { label: string; url: string; key: string }[] = [
      { label: 'WhatsApp', key: 'whatsapp', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
      { label: 'Facebook', key: 'facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(BRAND.url)}&quote=${encodeURIComponent(shareText)}` },
      { label: 'X', key: 'twitter', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
      { label: 'Copier', key: 'copy', url: '' },
    ];

    networks.forEach((net, i) => {
      const btn = makeButton(this, cx - 180 + i * 120, cy + 90, net.label, {
        width: 110, height: 48, fontSize: 13, variant: 'alt',
        onClick: () => {
          trackEvent({ type: 'share_click', network: net.key });
          if (net.key === 'copy') {
            navigator.clipboard?.writeText(shareText).catch(() => undefined);
            this.flashToast('📋 Lien copié !');
          } else {
            window.open(net.url, '_blank', 'noopener');
          }
        },
      });
      btn.setDepth(1003);
    });

    const cancel = makeButton(this, cx, cy + 155, 'Fermer', {
      width: 160, height: 44, fontSize: 14, variant: 'ghost',
      onClick: () => this.closeModal(overlay, []),
    });
    cancel.setDepth(1003);
  }

  private makeShareCard(): string {
    const key = `share_${this.gameData.islandId}_${this.gameData.score}_${Date.now()}`;
    const w = 720, h = 360;
    const island = ISLANDS[this.gameData.islandId];
    const top = Phaser.Display.Color.HexStringToColor(island.palette.sky[0]).color;
    const bot = Phaser.Display.Color.HexStringToColor(island.palette.sea).color;
    const accent = Phaser.Display.Color.HexStringToColor(island.palette.accent).color;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(0, h - 90, w, 90);
    g.lineStyle(6, accent, 1);
    g.strokeRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();

    // Composite text onto a render texture
    const rt = this.add.renderTexture(0, 0, w, h).setVisible(false);
    rt.draw(this.add.image(0, 0, key).setOrigin(0));
    const title = this.add.text(36, 36, `${island.flag} ${island.name}`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '36px', color: '#ffd166', fontStyle: 'bold',
    }).setVisible(false);
    rt.draw(title, 36, 36);
    const score = this.add.text(36, 100, String(this.gameData.score), {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '92px', color: '#fff7e8', fontStyle: 'bold',
    }).setVisible(false);
    rt.draw(score, 36, 100);
    const tag = this.add.text(36, 220, 'DJOK RUNNER', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '24px', color: '#fff7e8', fontStyle: 'bold',
    }).setVisible(false);
    rt.draw(tag, 36, 220);
    const brand = this.add.text(36, h - 60, `${BRAND.name}  •  ${BRAND.tagline}`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: '#ffd166',
    }).setVisible(false);
    rt.draw(brand, 36, h - 60);

    const finalKey = `${key}_final`;
    rt.saveTexture(finalKey);
    title.destroy(); score.destroy(); tag.destroy(); brand.destroy(); rt.destroy();
    return finalKey;
  }

  // ─── Promo modal ───

  private openPromoModal(): void {
    audio.click();
    if (!this.generatedPromo) {
      this.generatedPromo = state.promoCode ?? this.generatePromoCode();
      state.setPromoCode(this.generatedPromo);
      trackEvent({ type: 'promo_code_generated' });
    }
    trackEvent({ type: 'promo_code_revealed' });

    const overlay = this.modalOverlay();
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // CTAs are ≥56 high. They lay out horizontally inside the 520-wide panel
    // on the standard 960×540 internal canvas (3 × 150 + gaps fits comfortably);
    // on touch devices we stack vertically and grow the panel so each CTA
    // remains a comfortable tap target without crowding.
    const stackVertical = isMobileViewport();
    const panelW = 520;
    const panelH = stackVertical ? 460 : 320;
    const panel = this.add.image(cx, cy, 'ui_panel').setDisplaySize(panelW, panelH).setDepth(1001);
    void panel;

    this.add.text(cx, cy - panelH / 2 + 30, '🎁 Ton code -10%', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '24px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(cx, cy - panelH / 2 + 70, 'Valable sur la sélection Opportune 1791,\nchez nos cavistes partenaires.', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '13px', color: '#fff7e8', align: 'center',
    }).setOrigin(0.5).setDepth(1002);

    // Code box
    const codeBoxY = cy - panelH / 2 + 130;
    const codeBg = this.add.graphics().setDepth(1002);
    codeBg.fillStyle(0xffd166, 1);
    codeBg.fillRoundedRect(cx - 140, codeBoxY - 30, 280, 60, 10);
    codeBg.lineStyle(2, COLORS.deep, 1);
    codeBg.strokeRoundedRect(cx - 140, codeBoxY - 30, 280, 60, 10);

    this.add.text(cx, codeBoxY, this.generatedPromo, {
      fontFamily: 'monospace', fontSize: '32px', color: '#0a3d4f', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1003);

    const ctaW = stackVertical ? 220 : 150;
    const ctaH = 56;
    const cta1Y = codeBoxY + (stackVertical ? 60 : 80);
    const ctaGap = stackVertical ? ctaH + 8 : 0;

    const ctaPositions: Array<{ x: number; y: number }> = stackVertical
      ? [
        { x: cx, y: cta1Y },
        { x: cx, y: cta1Y + ctaGap },
        { x: cx, y: cta1Y + ctaGap * 2 },
      ]
      : [
        { x: cx - 160, y: cta1Y },
        { x: cx, y: cta1Y },
        { x: cx + 160, y: cta1Y },
      ];

    const copyBtn = makeButton(this, ctaPositions[0].x, ctaPositions[0].y, '📋 Copier', {
      width: ctaW, height: ctaH, fontSize: 14, variant: 'alt',
      onClick: () => {
        if (this.generatedPromo) {
          navigator.clipboard?.writeText(this.generatedPromo).catch(() => undefined);
          this.flashToast('Code copié !');
        }
      },
    });
    copyBtn.setDepth(1003);

    const visitBtn = makeButton(this, ctaPositions[1].x, ctaPositions[1].y, '🛒 Boutique', {
      width: ctaW, height: ctaH, fontSize: 14, variant: 'primary',
      onClick: () => {
        trackEvent({ type: 'product_link_click', rum: ISLANDS[this.gameData.islandId].rum.name });
        window.open(BRAND.url, '_blank', 'noopener');
      },
    });
    visitBtn.setDepth(1003);

    const cavistesBtn = makeButton(this, ctaPositions[2].x, ctaPositions[2].y, '📍 Cavistes', {
      width: ctaW, height: ctaH, fontSize: 14, variant: 'alt',
      onClick: () => {
        this.closeModal(overlay, [copyBtn, visitBtn, cavistesBtn, close]);
        this.goRetailers();
      },
    });
    cavistesBtn.setDepth(1003);

    const close = makeButton(this, cx, cy + panelH / 2 - 28, 'Fermer', {
      width: 140, height: 44, fontSize: 12, variant: 'ghost',
      onClick: () => this.closeModal(overlay, [copyBtn, visitBtn, cavistesBtn, close]),
    });
    close.setDepth(1003);
  }

  private generatePromoCode(): string {
    const part = (n: number): string => Array.from({ length: n }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
    return `DJOK-${part(4)}-${part(4)}`;
  }

  // ─── Modal helpers ───

  /**
   * Position an HTML overlay element so it sits on top of the canvas at
   * the given internal scene coordinates, accounting for Phaser's FIT
   * scaling + canvas position on the page.
   */
  private positionOverlay(el: HTMLElement, sceneX: number, sceneY: number, sceneW: number, sceneH: number): void {
    const canvas = this.scale.canvas;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / GAME_WIDTH;
    const sy = rect.height / GAME_HEIGHT;
    el.style.left = `${rect.left + sceneX * sx}px`;
    el.style.top = `${rect.top + sceneY * sy}px`;
    el.style.width = `${sceneW * sx}px`;
    el.style.height = `${sceneH * sy}px`;
  }

  private cleanupOverlays(): void {
    this.overlayResizeHandlers.forEach((h) => {
      window.removeEventListener('resize', h);
      this.scale.off(Phaser.Scale.Events.RESIZE, h);
    });
    this.overlayResizeHandlers = [];
    this.overlayElements.forEach((el) => el.remove());
    this.overlayElements = [];
  }

  private modalOverlay(): Phaser.GameObjects.Rectangle {
    const r = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setDepth(1000);
    r.setInteractive();
    return r;
  }

  private closeModal(overlay: Phaser.GameObjects.Rectangle, _objs: Phaser.GameObjects.GameObject[]): void {
    // Destroy everything at depth >= 1000
    this.children.list.slice().forEach((o) => {
      const depth = (o as { depth?: number }).depth ?? 0;
      if (depth >= 1000) o.destroy();
    });
    overlay.destroy();
  }

  private flashToast(msg: string): void {
    const t = this.add.text(GAME_WIDTH / 2, 100, msg, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '16px', color: '#0a3d4f', fontStyle: 'bold',
      backgroundColor: '#ffd166', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(2000).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, y: 80, duration: 200,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 300, onComplete: () => t.destroy() });
      },
    });
  }

  private replay(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('Level', { islandId: this.gameData.islandId });
    });
  }

  private goMap(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('Map');
    });
  }

  private goMenu(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('MainMenu');
    });
  }

  private goRetailers(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('Retailers');
    });
  }

  private ensureSparkTexture(): void {
    if (this.textures.exists('spark_fw')) return;
    const size = 16;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, 4);
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(size / 2, size / 2, 7);
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(size / 2, size / 2, 8);
    g.generateTexture('spark_fw', size, size);
    g.destroy();
  }

  private launchFireworks(): void {
    this.ensureSparkTexture();

    const palette = [
      COLORS.gold,
      COLORS.fuchsia,
      COLORS.turquoise,
      COLORS.terracotta,
      COLORS.cream,
      0xff5e62,
      0x4caf50,
    ];

    const burst = (x: number, y: number, color: number): void => {
      const emitter = this.add.particles(x, y, 'spark_fw', {
        speed: { min: 140, max: 320 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 700, max: 1100 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 220,
        blendMode: 'ADD',
        tint: color,
        quantity: 0,
        emitting: false,
      });
      emitter.setDepth(1500);
      emitter.explode(48, x, y);

      // Bright flash at the burst centre
      const flash = this.add.circle(x, y, 26, color, 0.9).setDepth(1499).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2.2,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });

      // Audio cue (uses existing victory tone — soft pop)
      try { audio.click(); } catch { /* ignore */ }

      // Auto-cleanup
      this.time.delayedCall(1300, () => emitter.destroy());
    };

    const launchOne = (): void => {
      const x = Phaser.Math.Between(120, GAME_WIDTH - 120);
      const y = Phaser.Math.Between(80, GAME_HEIGHT * 0.55);
      const color = Phaser.Utils.Array.GetRandom(palette);

      // Trailing rocket rising to the burst point
      const startY = GAME_HEIGHT - 20;
      const rocket = this.add.image(x, startY, 'spark_fw')
        .setTint(color)
        .setScale(0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(1498);
      const trail = this.add.particles(x, startY, 'spark_fw', {
        speed: { min: 20, max: 60 },
        lifespan: 220,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: color,
        blendMode: 'ADD',
        follow: rocket,
        quantity: 1,
        frequency: 18,
      });
      trail.setDepth(1497);
      this.tweens.add({
        targets: rocket,
        y,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => {
          rocket.destroy();
          this.time.delayedCall(180, () => trail.destroy());
          burst(x, y, color);
        },
      });
    };

    // Initial big finale near the score box, then 6 rockets staggered
    this.time.delayedCall(150, () => burst(GAME_WIDTH / 2, 180, COLORS.gold));
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(350 + i * 480, launchOne);
    }
    // Encore burst loop for the first 6 seconds
    const encore = this.time.addEvent({
      delay: 1100,
      startAt: 4000,
      loop: true,
      callback: launchOne,
    });
    this.time.delayedCall(8500, () => encore.remove());
  }
}
