// lib/storage/image-optimizer.ts
import sharp from "sharp";

export type ImageType = "avatar" | "banner" | "wallpaper" | "post" | "wiki";

interface OptimizeOptions {
  type: ImageType;
  quality?: number;
  format?: "webp" | "avif" | "jpeg";
}

interface ImageDimensions {
  width: number;
  height?: number;
  fit?: "cover" | "contain" | "inside" | "outside";
}

/**
 * Dimensões recomendadas por tipo de imagem
 */
const IMAGE_SIZES: Record<ImageType, ImageDimensions> = {
  avatar: {
    width: 200,
    height: 200,
    fit: "cover",
  },
  banner: {
    width: 1200,
    height: 400,
    fit: "cover",
  },
  wallpaper: {
    width: 1920,
    fit: "inside",
  },
  post: {
    width: 1200,
    fit: "inside",
  },
  wiki: {
    width: 1600,
    fit: "inside",
  },
};

/**
 * Otimizar imagem para upload
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions,
): Promise<Buffer> {
  const { type, quality = 85, format = "webp" } = options;
  const dimensions = IMAGE_SIZES[type];

  let pipeline = sharp(buffer).resize(dimensions.width, dimensions.height, {
    fit: dimensions.fit || "inside",
    withoutEnlargement: true,
  });

  // Aplicar formato
  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: quality - 5 }); // AVIF é mais eficiente
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Gerar blur placeholder (base64)
 */
export async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  const placeholder = await sharp(buffer)
    .resize(20, 20, { fit: "cover" })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${placeholder.toString("base64")}`;
}

/**
 * Obter metadados da imagem
 */
export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: metadata.size,
    hasAlpha: metadata.hasAlpha,
  };
}

/**
 * Validar se o arquivo é uma imagem válida
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

/**
 * Calcular tamanho estimado após otimização
 */
export function estimateOptimizedSize(
  originalSize: number,
  format: "webp" | "avif" | "jpeg" = "webp",
): number {
  const compressionRates = {
    webp: 0.7, // ~30% de redução
    avif: 0.5, // ~50% de redução
    jpeg: 0.85, // ~15% de redução
  };

  return Math.ceil(originalSize * compressionRates[format]);
}

/**
 * Processar imagem com múltiplas variantes
 */
export async function processImageVariants(buffer: Buffer) {
  const [original, placeholder] = await Promise.all([
    optimizeImage(buffer, { type: "post" }),
    generateBlurPlaceholder(buffer),
  ]);

  return {
    original,
    placeholder,
  };
}

/**
 * Limites de tamanho de arquivo
 */
export const IMAGE_SIZE_LIMITS = {
  avatar: 2 * 1024 * 1024, // 2MB
  banner: 5 * 1024 * 1024, // 5MB
  wallpaper: 10 * 1024 * 1024, // 10MB
  post: 5 * 1024 * 1024, // 5MB
  wiki: 5 * 1024 * 1024, // 5MB
};

/**
 * Validar tamanho do arquivo
 */
export function validateFileSize(size: number, type: ImageType): boolean {
  return size <= IMAGE_SIZE_LIMITS[type];
}
