export type Wallpaper = {
  id: string;
  name: string;
  kind: "css" | "svg";
  css?: string;
  svg?: string;
  isDark: boolean;
  accent?: "royal" | "blue" | "neutral";
  recommendedText?: "light" | "dark";
};

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "royalGrid",
    name: "Royal Grid",
    kind: "css",
    css: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 20% 20%, #1e3a8a 0%, #111827 60%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
  },
  {
    id: "royalNebula",
    name: "Royal Nebula",
    kind: "css",
    css: "radial-gradient(circle at 20% 20%, rgba(129,140,248,0.45), transparent 45%), radial-gradient(circle at 80% 15%, rgba(59,130,246,0.35), transparent 45%), linear-gradient(160deg, #0b1026 0%, #111827 70%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
  },
  {
    id: "blueNoise",
    name: "Blue Noise",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><rect width='240' height='240' fill='#e0f2fe'/><circle cx='24' cy='36' r='2' fill='#bae6fd'/><circle cx='88' cy='102' r='2' fill='#bfdbfe'/><circle cx='190' cy='40' r='2' fill='#93c5fd'/><circle cx='210' cy='190' r='2' fill='#60a5fa'/><circle cx='120' cy='180' r='2' fill='#93c5fd'/></svg>`,
    isDark: false,
    accent: "blue",
    recommendedText: "dark",
  },
  {
    id: "paperLight",
    name: "Paper Light",
    kind: "css",
    css: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    isDark: false,
    accent: "neutral",
    recommendedText: "dark",
  },
  {
    id: "carbonBlue",
    name: "Carbon Blue",
    kind: "css",
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px), linear-gradient(145deg, #0f172a 0%, #1e3a8a 100%)",
    isDark: true,
    accent: "blue",
    recommendedText: "light",
  },
  {
    id: "gradientRoyal",
    name: "Gradient Royal",
    kind: "css",
    css: "linear-gradient(140deg, #1d4ed8 0%, #312e81 55%, #0f172a 100%)",
    isDark: true,
    accent: "royal",
    recommendedText: "light",
  },
  {
    id: "frostBlue",
    name: "Frost Blue",
    kind: "css",
    css: "linear-gradient(160deg, #f8fbff 0%, #e0f2fe 45%, #dbeafe 100%)",
    isDark: false,
    accent: "blue",
    recommendedText: "dark",
  },
  {
    id: "wavesRoyal",
    name: "Waves Royal",
    kind: "svg",
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#1e3a8a'/><stop offset='100%' stop-color='#0f172a'/></linearGradient></defs><rect width='1600' height='900' fill='url(#g)'/><path d='M0,540 C280,470 380,690 720,620 C940,580 1110,450 1600,520 L1600,900 L0,900 Z' fill='rgba(255,255,255,0.10)'/><path d='M0,620 C260,560 390,760 760,700 C980,660 1200,560 1600,620 L1600,900 L0,900 Z' fill='rgba(255,255,255,0.07)'/></svg>`,
    isDark: true,
    accent: "royal",
    recommendedText: "light",
  },
];

export function getWallpaperById(wallpaperId?: string | null) {
  if (!wallpaperId) return null;
  return WALLPAPERS.find((item) => item.id === wallpaperId) ?? null;
}


// aliases para compatibilidade
export const WALLPAPER_CATALOG = WALLPAPERS;
export const getWallpaper = getWallpaperById;
