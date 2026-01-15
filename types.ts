export enum AppMode {
  TEXT_TO_SPRITE = 'TEXT_TO_SPRITE',
  AI_EDIT = 'AI_EDIT',
  ANIMATION = 'ANIMATION',
  SPRITE_SHEET = 'SPRITE_SHEET',
  STYLE_TRANSFER = 'STYLE_TRANSFER',
  BACKGROUND_REMOVAL = 'BACKGROUND_REMOVAL',
  TILE_GENERATOR = 'TILE_GENERATOR'
}

export enum SpriteSize {
  S16 = '16x16',
  S32 = '32x32',
  S64 = '64x64'
}

export enum ImageResolution {
  R1K = '1K',
  R2K = '2K',
  R4K = '4K'
}

export enum ArtStyle {
  RETRO_8BIT = '8-bit NES Style',
  RETRO_16BIT = '16-bit SNES Style',
  GAMEBOY = 'Gameboy Monochrome',
  CYBERPUNK = 'Neon Cyberpunk',
  FANTASY = 'High Fantasy',
  ISOMETRIC = 'Isometric RPG',
  HORROR = 'Gothic Horror',
  SCIFI = 'Sci-Fi Industrial',
  PICO8 = 'Pico-8 Palette',
  JRPG = 'Cute JRPG',
  VAPORWAVE = 'Vaporwave Aesthetic',
  NOIR = 'Noir Detective (B&W)',
  MECHA = 'Mecha & Robots',
  STEAMPUNK = 'Steampunk',
  WESTERN = 'Wild Western',
  FLAT = 'Modern Flat Pixel',
  CUSTOM = 'Custom Style'
}

export interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  type: 'sprite' | 'animation' | 'background';
  timestamp: number;
}

export interface AnimationConfig {
  frames: number;
  fps: number;
  type: 'idle' | 'walk' | 'attack';
}