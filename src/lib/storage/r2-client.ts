// lib/storage/r2-client.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Configurar cliente R2
const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadOptions {
  file: File | Buffer;
  path: string;
  contentType?: string;
  cacheControl?: string;
}

/**
 * Upload de arquivo para Cloudflare R2
 */
export async function uploadToR2({
  file,
  path,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
}: UploadOptions): Promise<string> {
  const buffer =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  await R2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: path,
      Body: buffer,
      ContentType:
        contentType || (file instanceof File ? file.type : "image/webp"),
      CacheControl: cacheControl,
    }),
  );

  // URL pública
  const publicUrl = process.env.R2_PUBLIC_URL!;
  return `${publicUrl}/${path}`;
}

/**
 * Deletar arquivo do R2
 */
export async function deleteFromR2(path: string): Promise<void> {
  await R2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: path,
    }),
  );
}

/**
 * Gerar path único para arquivo
 */
export function generateImagePath(
  userId: string,
  type: "avatar" | "banner" | "wallpaper" | "post" | "wiki",
  extension: string = "webp",
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${type}s/${userId}/${timestamp}-${random}.${extension}`;
}

/**
 * Extrair path do URL R2 para deletar
 */
export function extractR2Path(url: string): string | null {
  try {
    const publicUrl = process.env.R2_PUBLIC_URL!;
    if (!url.startsWith(publicUrl)) return null;
    return url.replace(`${publicUrl}/`, "");
  } catch {
    return null;
  }
}
