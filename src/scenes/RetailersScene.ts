import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { makeTitle, makeSubtitle, makeButton, makeHomeButton } from '../ui/widgets';
import { audio } from '../systems/audio';
import { trackEvent } from '../systems/analytics';
import { RETAILERS, type Retailer } from '../data/retailers';

const PAGE_SIZE = 5;

interface RetailerWithDist extends Retailer {
  distanceKm?: number;
}

export class RetailersScene extends Phaser.Scene {
  private searchInput?: HTMLInputElement;
  private listContainer?: Phaser.GameObjects.Container;
  private paginationContainer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;

  private query = '';
  private countryFilter: string | null = null;
  private userPos: { lat: number; lng: number } | null = null;
  private page = 0;

  private resizeHandler?: () => void;

  constructor() { super('Retailers'); }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0xff9a76, 0xff9a76, 0x1ca7a3, 0x1ca7a3, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.image(GAME_WIDTH * 0.85, 70, 'bg_sun').setScale(1.1).setAlpha(0.55);
    this.add.image(60, GAME_HEIGHT - 50, 'bg_palm').setScale(0.6).setAlpha(0.45);
    this.add.image(GAME_WIDTH - 60, GAME_HEIGHT - 50, 'bg_palm').setScale(0.6).setAlpha(0.45).setFlipX(true);

    // Title + subtitle
    makeTitle(this, GAME_WIDTH / 2, 30, '📍 Trouve un caviste', 26);
    makeSubtitle(this, GAME_WIDTH / 2, 58, 'Nos partenaires Opportune 1791', 12, '#ffd166');

    // Search input (HTML overlay)
    this.createSearchInput();

    // Country chips
    this.createCountryChips();

    // Geolocation button (visually small; hit area is 48 via widget min)
    makeButton(this, GAME_WIDTH - 130, 170, '📡 Près de moi', {
      width: 200, height: 34, fontSize: 12, variant: 'alt',
      onClick: () => this.requestGeolocation(),
    });

    // Status text (geo errors / info)
    this.statusText = this.add.text(GAME_WIDTH / 2, 200, '', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px', color: '#ffd166', fontStyle: 'italic',
    }).setOrigin(0.5);

    // List + pagination
    this.renderList();

    // Home button (top-right, consistent across navigable scenes)
    makeHomeButton(this, () => this.goBack());

    // Legal mention
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10,
      'À consommer avec modération • L\'abus d\'alcool est dangereux pour la santé',
      {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '10px', color: '#fff7e8',
      }).setOrigin(0.5).setAlpha(0.75);

    audio.resume();
    audio.playMusic('menu');

    trackEvent({ type: 'retailer_lookup' });

    // Cleanup on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  // ─── Search input ─────────────────────────────────────────────────────

  private createSearchInput(): void {
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '🔎 Rechercher (nom, ville, pays)…';
    input.value = this.query;
    input.style.cssText = `
      position: fixed;
      z-index: 9999;
      padding: 10px 14px;
      font-size: 16px;
      border-radius: 8px;
      border: 2px solid #ffd166;
      background: #fff7e8;
      color: #0a3d4f;
      font-family: 'Trebuchet MS', sans-serif;
      outline: none;
      box-sizing: border-box;
    `;
    document.body.appendChild(input);
    this.searchInput = input;

    input.addEventListener('input', () => {
      this.query = input.value.trim().toLowerCase();
      this.page = 0;
      this.renderList();
    });

    this.positionSearchInput();

    this.resizeHandler = (): void => this.positionSearchInput();
    window.addEventListener('resize', this.resizeHandler);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
  }

  private positionSearchInput(): void {
    if (!this.searchInput) return;
    const canvas = this.scale.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    // Anchor: input is centered horizontally, at scene y=92 (clears subtitle).
    const inputW = 400;
    const inputH = 48;
    const sceneX = GAME_WIDTH / 2 - inputW / 2;
    const sceneY = 92 - inputH / 2;
    const left = rect.left + sceneX * scaleX;
    const top = rect.top + sceneY * scaleY;
    this.searchInput.style.left = `${left}px`;
    this.searchInput.style.top = `${top}px`;
    this.searchInput.style.width = `${inputW * scaleX}px`;
    this.searchInput.style.height = `${inputH * scaleY}px`;
    this.searchInput.style.transform = 'none';
  }

  // ─── Country chips ────────────────────────────────────────────────────

  private createCountryChips(): void {
    const countries = Array.from(new Set(RETAILERS.map((r) => r.country)));
    const labels = ['Tous', ...countries];
    const startX = GAME_WIDTH / 2 - ((labels.length - 1) * 95) / 2;
    const y = 132;

    const chipButtons: Phaser.GameObjects.Container[] = [];
    labels.forEach((label, i) => {
      const value = label === 'Tous' ? null : label;
      const isActive = this.countryFilter === value;
      const chip = makeButton(this, startX + i * 95, y, label, {
        width: 90, height: 28, fontSize: 11,
        variant: isActive ? 'primary' : 'ghost',
        onClick: () => {
          this.countryFilter = value;
          this.page = 0;
          // Re-style: redraw chips
          chipButtons.forEach((c) => c.destroy());
          this.createCountryChips();
          this.renderList();
        },
      });
      chipButtons.push(chip);
    });
  }

  // ─── List rendering ───────────────────────────────────────────────────

  private getFilteredRetailers(): RetailerWithDist[] {
    let list: RetailerWithDist[] = RETAILERS.map((r) => ({ ...r }));

    if (this.countryFilter) {
      list = list.filter((r) => r.country === this.countryFilter);
    }
    if (this.query) {
      const q = this.query;
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q),
      );
    }
    if (this.userPos) {
      const { lat, lng } = this.userPos;
      list.forEach((r) => {
        r.distanceKm = haversineKm(lat, lng, r.lat, r.lng);
      });
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return list;
  }

  private renderList(): void {
    this.listContainer?.destroy();
    this.paginationContainer?.destroy();

    const list = this.getFilteredRetailers();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (this.page >= totalPages) this.page = totalPages - 1;
    if (this.page < 0) this.page = 0;

    const start = this.page * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    const container = this.add.container(0, 0);
    this.listContainer = container;

    if (slice.length === 0) {
      const empty = this.add.text(GAME_WIDTH / 2, 320, 'Aucun caviste trouvé.\nEssaie une autre recherche.', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '14px', color: '#fff7e8', align: 'center',
      }).setOrigin(0.5);
      container.add(empty);
    } else {
      const cardX = GAME_WIDTH / 2;
      const cardY0 = 232;
      const cardH = 46;
      slice.forEach((r, i) => {
        const card = this.makeRetailerCard(cardX, cardY0 + i * (cardH + 4), r);
        container.add(card);
      });
    }

    // Pagination row
    const pag = this.add.container(0, 0);
    this.paginationContainer = pag;
    const pagY = GAME_HEIGHT - 60;
    const cx = GAME_WIDTH / 2;

    const prev = makeButton(this, cx - 110, pagY, '◀', {
      width: 50, height: 32, fontSize: 14, variant: 'alt',
      onClick: () => {
        if (this.page > 0) {
          this.page -= 1;
          this.renderList();
        }
      },
    });
    const next = makeButton(this, cx + 110, pagY, '▶', {
      width: 50, height: 32, fontSize: 14, variant: 'alt',
      onClick: () => {
        if (this.page < totalPages - 1) {
          this.page += 1;
          this.renderList();
        }
      },
    });
    const counter = this.add.text(cx, pagY,
      `${list.length} résultat${list.length > 1 ? 's' : ''} • page ${this.page + 1} / ${totalPages}`,
      {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '12px', color: '#fff7e8',
      }).setOrigin(0.5);

    pag.add([prev, next, counter]);
  }

  private makeRetailerCard(x: number, y: number, r: RetailerWithDist): Phaser.GameObjects.Container {
    const w = 720;
    const h = 50;
    const c = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a3d4f, 0.85);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1, COLORS.gold, 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    c.add(bg);

    // Type icon
    const iconMap: Record<string, string> = {
      caviste: '🍷',
      bar: '🍸',
      restaurant: '🍽️',
      eshop: '🛒',
    };
    const icon = iconMap[r.type ?? 'caviste'] ?? '📍';
    const iconText = this.add.text(-w / 2 + 18, 0, icon, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);
    c.add(iconText);

    // Name (bold)
    const name = this.add.text(-w / 2 + 40, -14, r.name, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    c.add(name);

    // City + country
    const cityLine = `${r.city} • ${r.country}`;
    const cityText = this.add.text(-w / 2 + 40, 2, cityLine, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '11px', color: '#fff7e8',
    }).setOrigin(0, 0.5);
    c.add(cityText);

    // Address
    const addr = this.add.text(-w / 2 + 40, 16, r.address, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '10px', color: '#ccdde2',
    }).setOrigin(0, 0.5);
    c.add(addr);

    // Distance badge (if available)
    if (typeof r.distanceKm === 'number') {
      const distLabel = r.distanceKm < 1
        ? `à ${Math.round(r.distanceKm * 1000)} m`
        : `à ${r.distanceKm < 10 ? r.distanceKm.toFixed(1) : Math.round(r.distanceKm)} km`;
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(COLORS.fuchsia, 1);
      badgeBg.fillRoundedRect(w / 2 - 250, -h / 2 + 6, 70, 18, 9);
      const badge = this.add.text(w / 2 - 215, -h / 2 + 15, distLabel, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '10px', color: '#fff7e8', fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add([badgeBg, badge]);
    }

    // Action buttons (right side)
    let actionX = w / 2 - 60;
    if (r.website) {
      const wbtn = makeButton(this, actionX, 0, '🌐 Site', {
        width: 90, height: 28, fontSize: 11, variant: 'primary',
        onClick: () => {
          if (r.website) window.open(r.website, '_blank', 'noopener');
        },
      });
      c.add(wbtn);
      actionX -= 100;
    }
    if (r.phone) {
      const pbtn = makeButton(this, actionX, 0, '📞 Appeler', {
        width: 90, height: 28, fontSize: 11, variant: 'alt',
        onClick: () => {
          if (r.phone) window.location.href = `tel:${r.phone.replace(/\s+/g, '')}`;
        },
      });
      c.add(pbtn);
    }

    return c;
  }

  // ─── Geolocation ──────────────────────────────────────────────────────

  private requestGeolocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.flashStatus('⚠️ Géolocalisation non disponible', '#ffd166');
      return;
    }
    this.flashStatus('Recherche de ta position…', '#fff7e8');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.flashStatus('✓ Tri par distance activé', '#4caf50');
        this.page = 0;
        this.renderList();
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? '⚠️ Permission refusée — affiche la liste complète'
          : '⚠️ Position introuvable — affiche la liste complète';
        this.flashStatus(msg, '#e94f8a');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  private flashStatus(msg: string, color: string): void {
    if (!this.statusText) return;
    this.statusText.setText(msg);
    this.statusText.setColor(color);
  }

  // ─── Navigation / cleanup ─────────────────────────────────────────────

  private goBack(): void {
    audio.click();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('MainMenu');
    });
  }

  private cleanup(): void {
    if (this.searchInput) {
      this.searchInput.remove();
      this.searchInput = undefined;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
      this.resizeHandler = undefined;
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
