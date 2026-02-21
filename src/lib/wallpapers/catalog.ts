/**
 * catalog.ts
 *
 * O banco tem uma tabela `wallpapers` (id uuid, slug text, title, kind, payload jsonb).
 * As tabelas posts/wiki_pages/chats têm:
 *   - wallpaper_id   uuid FK → public.wallpapers(id)
 *   - wallpaper_slug text  → slug de conveniência para lookup LOCAL (zero banda)
 *
 * Este arquivo define os wallpapers embutidos (CSS/SVG puro).
 * O WallpaperBackground resolve o estilo pelo `wallpaper_slug`, sem ir ao banco.
 * Os slugs aqui DEVEM corresponder aos slugs cadastrados na tabela `wallpapers`.
 */

export type Wallpaper = {
  id: string;
  name: string;
  kind: "css" | "svg";
  css?: string;
  svg?: string;
  isDark: boolean;
  accent?:
    | "royal"
    | "blue"
    | "neutral"
    | "purple"
    | "green"
    | "rose"
    | "amber"
    | "teal";
  recommendedText?: "light" | "dark";
  category?: "dark" | "light" | "pattern" | "nature";
};

// ─── ESCUROS ────────────────────────────────────────────────────────────────

const darkWallpapers: Wallpaper[] = [
  {
    id: "royalGrid",
    name: "Royal Grid",
    kind: "css",
    css: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), radial-gradient(circle at 20% 20%, #1e3a8a 0%, #0f172a 60%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "royalNebula",
    name: "Royal Nebula",
    kind: "css",
    css: "radial-gradient(circle at 20% 20%, rgba(129,140,248,0.45), transparent 45%), radial-gradient(circle at 80% 15%, rgba(59,130,246,0.35), transparent 45%), linear-gradient(160deg, #0b1026 0%, #111827 70%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "carbonBlue",
    name: "Carbon Blue",
    kind: "css",
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px), linear-gradient(145deg, #0f172a 0%, #1e3a8a 100%)",
    isDark: true,
    accent: "blue",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "gradientRoyal",
    name: "Gradient Royal",
    kind: "css",
    css: "linear-gradient(140deg, #1d4ed8 0%, #312e81 55%, #0f172a 100%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "midnightPurple",
    name: "Midnight Purple",
    kind: "css",
    css: "radial-gradient(ellipse at top left, #4c1d95 0%, #1e1b4b 40%, #0f0a1e 100%)",
    isDark: true,
    accent: "purple",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    kind: "css",
    css: "linear-gradient(160deg, #1c1c1e 0%, #2c2c2e 100%)",
    isDark: true,
    accent: "neutral",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "deepForest",
    name: "Deep Forest",
    kind: "css",
    css: "radial-gradient(circle at 30% 70%, #064e3b 0%, #0f2419 60%, #030f07 100%)",
    isDark: true,
    accent: "green",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "crimsonDark",
    name: "Crimson Dark",
    kind: "css",
    css: "radial-gradient(ellipse at top right, #881337 0%, #3b0764 50%, #0f0a1e 100%)",
    isDark: true,
    accent: "rose",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "deepOcean",
    name: "Deep Ocean",
    kind: "css",
    css: "linear-gradient(180deg, #0c1445 0%, #0a2352 40%, #051230 100%)",
    isDark: true,
    accent: "blue",
    recommendedText: "light",
    category: "dark",
  },
  {
    id: "auroraGlow",
    name: "Aurora Glow",
    kind: "css",
    css: "radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.35), transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(139,92,246,0.4), transparent 50%), linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
    isDark: true,
    accent: "teal",
    recommendedText: "light",
    category: "dark",
  },
];

// ─── CLAROS ─────────────────────────────────────────────────────────────────

const lightWallpapers: Wallpaper[] = [
  {
    id: "paperLight",
    name: "Paper Light",
    kind: "css",
    css: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    isDark: false,
    accent: "neutral",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "frostBlue",
    name: "Frost Blue",
    kind: "css",
    css: "linear-gradient(160deg, #f8fbff 0%, #e0f2fe 45%, #dbeafe 100%)",
    isDark: false,
    accent: "blue",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "peachCream",
    name: "Peach Cream",
    kind: "css",
    css: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fde68a 100%)",
    isDark: false,
    accent: "amber",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "mintFresh",
    name: "Mint Fresh",
    kind: "css",
    css: "linear-gradient(160deg, #f0fdf4 0%, #d1fae5 50%, #a7f3d0 100%)",
    isDark: false,
    accent: "green",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "lavenderMist",
    name: "Lavender Mist",
    kind: "css",
    css: "linear-gradient(160deg, #faf5ff 0%, #ede9fe 50%, #ddd6fe 100%)",
    isDark: false,
    accent: "purple",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "rosePetal",
    name: "Rose Petal",
    kind: "css",
    css: "linear-gradient(160deg, #fff1f2 0%, #fecdd3 50%, #fda4af 100%)",
    isDark: false,
    accent: "rose",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "skyNoon",
    name: "Sky Noon",
    kind: "css",
    css: "linear-gradient(180deg, #bfdbfe 0%, #e0f2fe 60%, #f0f9ff 100%)",
    isDark: false,
    accent: "blue",
    recommendedText: "dark",
    category: "light",
  },
  {
    id: "warmCanvas",
    name: "Warm Canvas",
    kind: "css",
    css: "linear-gradient(160deg, #fffbeb 0%, #fef3c7 100%)",
    isDark: false,
    accent: "amber",
    recommendedText: "dark",
    category: "light",
  },
];

// ─── PADRÕES SVG ─────────────────────────────────────────────────────────────

const patternWallpapers: Wallpaper[] = [
  {
    id: "blueNoise",
    name: "Blue Noise",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><rect width='240' height='240' fill='#e0f2fe'/><circle cx='24' cy='36' r='2' fill='#bae6fd'/><circle cx='88' cy='102' r='2' fill='#bfdbfe'/><circle cx='190' cy='40' r='2' fill='#93c5fd'/><circle cx='210' cy='190' r='2' fill='#60a5fa'/><circle cx='120' cy='180' r='2' fill='#93c5fd'/><circle cx='60' cy='150' r='1.5' fill='#7dd3fc'/><circle cx='160' cy='90' r='1.5' fill='#38bdf8'/><circle cx='200' cy='130' r='1.5' fill='#0ea5e9'/></svg>`,
    isDark: false,
    accent: "blue",
    recommendedText: "dark",
    category: "pattern",
  },
  {
    id: "wavesRoyal",
    name: "Waves Royal",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0f172a'/></linearGradient></defs><rect width='1200' height='700' fill='url(#g)'/><path d='M0,420 C210,350 290,530 540,470 C710,430 840,330 1200,400 L1200,700 L0,700 Z' fill='rgba(255,255,255,0.08)'/><path d='M0,490 C200,430 300,590 580,540 C740,510 900,420 1200,490 L1200,700 L0,700 Z' fill='rgba(255,255,255,0.05)'/></svg>`,
    isDark: true,
    accent: "royal",
    recommendedText: "light",
    category: "pattern",
  },
  {
    id: "dotGridDark",
    name: "Dot Grid Dark",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='#0f172a'/><circle cx='20' cy='20' r='1.2' fill='rgba(148,163,184,0.3)'/></svg>`,
    isDark: true,
    accent: "neutral",
    recommendedText: "light",
    category: "pattern",
  },
  {
    id: "dotGridLight",
    name: "Dot Grid Light",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='#f8fafc'/><circle cx='20' cy='20' r='1.2' fill='rgba(100,116,139,0.3)'/></svg>`,
    isDark: false,
    accent: "neutral",
    recommendedText: "dark",
    category: "pattern",
  },
  {
    id: "hexDark",
    name: "Hex Dark",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='104'><rect width='60' height='104' fill='#111827'/><polygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='rgba(99,102,241,0.18)' stroke-width='1'/><polygon points='30,52 58,67 58,97 30,112 2,97 2,67' fill='none' stroke='rgba(99,102,241,0.18)' stroke-width='1'/><polygon points='-30,27 -2,12 28,27 28,57 -2,72 -30,57' fill='none' stroke='rgba(99,102,241,0.18)' stroke-width='1'/><polygon points='62,27 90,12 120,27 120,57 90,72 62,57' fill='none' stroke='rgba(99,102,241,0.18)' stroke-width='1'/></svg>`,
    isDark: true,
    accent: "purple",
    recommendedText: "light",
    category: "pattern",
  },
  {
    id: "diagonalStripes",
    name: "Diagonal Lines",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='20' height='20' fill='#0f172a'/><line x1='0' y1='20' x2='20' y2='0' stroke='rgba(148,163,184,0.12)' stroke-width='1'/></svg>`,
    isDark: true,
    accent: "neutral",
    recommendedText: "light",
    category: "pattern",
  },
  {
    id: "crosshatchLight",
    name: "Crosshatch Light",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='#f8fafc'/><path d='M0 0 L24 24 M24 0 L0 24' stroke='rgba(100,116,139,0.15)' stroke-width='0.8'/></svg>`,
    isDark: false,
    accent: "neutral",
    recommendedText: "dark",
    category: "pattern",
  },
  {
    id: "circuitBoard",
    name: "Circuit Board",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='#0f172a'/><path d='M10,10 L40,10 L40,40 M70,10 L40,10 M10,70 L40,70 L40,40 M70,70 L40,70' stroke='rgba(56,189,248,0.2)' stroke-width='1.2' fill='none'/><circle cx='10' cy='10' r='2.5' fill='rgba(56,189,248,0.3)'/><circle cx='70' cy='10' r='2.5' fill='rgba(56,189,248,0.3)'/><circle cx='10' cy='70' r='2.5' fill='rgba(56,189,248,0.3)'/><circle cx='70' cy='70' r='2.5' fill='rgba(56,189,248,0.3)'/><circle cx='40' cy='40' r='3' fill='rgba(56,189,248,0.25)'/></svg>`,
    isDark: true,
    accent: "teal",
    recommendedText: "light",
    category: "pattern",
  },
];

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export const WALLPAPERS: Wallpaper[] = [
  ...darkWallpapers,
  ...lightWallpapers,
  ...patternWallpapers,
];

export const WALLPAPER_CATEGORIES = [
  { id: "dark", label: "Escuros" },
  { id: "light", label: "Claros" },
  { id: "pattern", label: "Padrões" },
] as const;

/**
 * Resolve wallpaper pelo SLUG (campo `wallpaper_slug` nas tabelas do banco).
 * O campo `wallpaper_id` é UUID FK — usado para JOIN com a tabela `wallpapers`.
 * O WallpaperBackground usa este método para renderizar sem IR ao banco.
 */
export function getWallpaperBySlug(slug?: string | null): Wallpaper | null {
  if (!slug) return null;
  return WALLPAPERS.find((w) => w.id === slug) ?? null;
}

// aliases para compatibilidade com código existente
export const WALLPAPER_CATALOG = WALLPAPERS;
export const getWallpaper = getWallpaperBySlug;
export const getWallpaperById = getWallpaperBySlug;
