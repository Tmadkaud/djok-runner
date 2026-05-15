import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { RECIPES } from '../data/recipes';
import { ISLANDS } from '../data/islands';
import { makeTitle, makeSubtitle, makeButton, makeHomeButton } from '../ui/widgets';
import { state } from '../systems/state';
import { audio } from '../systems/audio';

export class RecipesScene extends Phaser.Scene {
  private currentIndex = 0;
  private currentRecipeContainer?: Phaser.GameObjects.Container;

  constructor() { super('Recipes'); }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0xff9a76, 0xff9a76, 0xe94f8a, 0xe94f8a, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.image(80, GAME_HEIGHT - 60, 'bg_palm').setScale(0.7).setAlpha(0.5);
    this.add.image(GAME_WIDTH - 80, GAME_HEIGHT - 60, 'bg_palm').setScale(0.7).setAlpha(0.5).setFlipX(true);
    this.add.image(GAME_WIDTH * 0.5, 100, 'bg_sun').setScale(1.0).setAlpha(0.45);

    makeTitle(this, GAME_WIDTH / 2, 50, '🍹 Recettes Opportune', 30);
    makeSubtitle(this, GAME_WIDTH / 2, 80, 'Débloque les recettes en complétant les îles', 13);

    // Find first unlocked recipe
    this.currentIndex = Math.max(0, RECIPES.findIndex((r) => state.recipesUnlocked.includes(r.id)));
    if (this.currentIndex < 0) this.currentIndex = 0;

    this.renderRecipe();

    makeButton(this, 60, GAME_HEIGHT / 2, '◀', {
      width: 56, height: 56, fontSize: 26, variant: 'alt',
      onClick: () => this.move(-1),
    });
    makeButton(this, GAME_WIDTH - 60, GAME_HEIGHT / 2, '▶', {
      width: 56, height: 56, fontSize: 26, variant: 'alt',
      onClick: () => this.move(1),
    });

    makeHomeButton(this, () => this.goBack());

    audio.resume();
    audio.playMusic('menu');
    void COLORS;
  }

  private move(delta: number): void {
    audio.click();
    this.currentIndex = (this.currentIndex + delta + RECIPES.length) % RECIPES.length;
    this.renderRecipe();
  }

  private renderRecipe(): void {
    this.currentRecipeContainer?.destroy();
    const recipe = RECIPES[this.currentIndex];
    const unlocked = state.recipesUnlocked.includes(recipe.id);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const c = this.add.container(cx, cy);

    const panel = this.add.graphics();
    panel.fillStyle(0x0a3d4f, 0.92);
    panel.fillRoundedRect(-280, -180, 560, 340, 16);
    panel.lineStyle(3, COLORS.gold, 1);
    panel.strokeRoundedRect(-280, -180, 560, 340, 16);
    c.add(panel);

    if (!unlocked) {
      const lockedTitle = this.add.text(0, -40, '🔒 Recette verrouillée', {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '22px', color: '#fff7e8', fontStyle: 'bold',
      }).setOrigin(0.5);
      const islandName = ISLANDS[recipe.unlockedAfterIsland as keyof typeof ISLANDS]?.name ?? '?';
      const hint = this.add.text(0, 0, `Termine l'île ${islandName} pour la débloquer.`, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '14px', color: '#ffd166',
      }).setOrigin(0.5);
      const counter = this.add.text(0, 130, `${this.currentIndex + 1} / ${RECIPES.length}`, {
        fontFamily: 'Trebuchet MS, system-ui, sans-serif',
        fontSize: '12px', color: '#ccdde2',
      }).setOrigin(0.5);
      c.add([lockedTitle, hint, counter]);
      this.currentRecipeContainer = c;
      return;
    }

    const title = this.add.text(0, -150, recipe.name, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '26px', color: '#ffd166', fontStyle: 'bold',
    }).setOrigin(0.5);
    const sub = this.add.text(0, -120, `🥃 ${recipe.rum}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '14px', color: '#fff7e8',
    }).setOrigin(0.5);

    const ingTitle = this.add.text(-250, -90, 'Ingrédients', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '15px', color: '#e94f8a', fontStyle: 'bold',
    });
    const ing = this.add.text(-250, -68, recipe.ingredients.map((s) => '•  ' + s).join('\n'), {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px', color: '#fff7e8', wordWrap: { width: 230 },
    });

    const stepTitle = this.add.text(20, -90, 'Préparation', {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '15px', color: '#e94f8a', fontStyle: 'bold',
    });
    const step = this.add.text(20, -68, recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px', color: '#fff7e8', wordWrap: { width: 240 },
    });

    const counter = this.add.text(0, 130, `${this.currentIndex + 1} / ${RECIPES.length}`, {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '12px', color: '#ccdde2',
    }).setOrigin(0.5);
    const warn = this.add.text(0, 150, "L'abus d'alcool est dangereux pour la santé.", {
      fontFamily: 'Trebuchet MS, system-ui, sans-serif',
      fontSize: '10px', color: '#aaa', fontStyle: 'italic',
    }).setOrigin(0.5);

    c.add([title, sub, ingTitle, ing, stepTitle, step, counter, warn]);
    this.currentRecipeContainer = c;
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
