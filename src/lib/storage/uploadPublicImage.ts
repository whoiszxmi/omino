/**
 * ✅ ATUALIZADO PARA R2
 *
 * Helper para upload de imagens públicas usando Cloudflare R2
 * Esta função agora usa a API route /api/upload que faz upload para R2
 */

export async function uploadPublicImage({
  file,
  type = "post",
}: {
  file: File;
  /** Tipo de imagem para otimização apropriada */
  type?: "avatar" | "banner" | "wallpaper" | "post" | "wiki";
  /** @deprecated bucket não é mais usado (mantido para compatibilidade) */
  bucket?: string;
  /** @deprecated folder não é mais usado (mantido para compatibilidade) */
  folder?: string;
}): Promise<string> {
  // Validar tamanho
  const maxSizes = {
    avatar: 2 * 1024 * 1024, // 2MB
    banner: 5 * 1024 * 1024, // 5MB
    wallpaper: 10 * 1024 * 1024, // 10MB
    post: 5 * 1024 * 1024, // 5MB
    wiki: 5 * 1024 * 1024, // 5MB
  };

  if (file.size > maxSizes[type]) {
    throw new Error(
      `Imagem muito grande. Máximo: ${maxSizes[type] / (1024 * 1024)}MB`,
    );
  }

  // Validar tipo
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo deve ser uma imagem");
  }

  // Preparar FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  // Upload via API route (usa R2)
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao fazer upload");
  }

  const data = await response.json();
  return data.url; // URL do Cloudflare R2
}

/**
 * Exemplo de uso:
 *
 * ```typescript
 * // Avatar
 * const avatarUrl = await uploadPublicImage({
 *   file: avatarFile,
 *   type: "avatar",
 * });
 *
 * // Banner
 * const bannerUrl = await uploadPublicImage({
 *   file: bannerFile,
 *   type: "banner",
 * });
 *
 * // Imagem em post
 * const imageUrl = await uploadPublicImage({
 *   file: imageFile,
 *   type: "post",
 * });
 * ```
 */
