import { uploadImageAction } from "@/app/actions/upload";

export async function uploadPublicImage({
  file,
  type = "post",
}: {
  file: File;
  type?: "avatar" | "banner" | "wallpaper" | "post" | "wiki";
  /** @deprecated não usado mais */
  bucket?: string;
  /** @deprecated não usado mais */
  folder?: string;
}): Promise<string> {
  const maxSizes = {
    avatar: 2 * 1024 * 1024,
    banner: 5 * 1024 * 1024,
    wallpaper: 10 * 1024 * 1024,
    post: 5 * 1024 * 1024,
    wiki: 5 * 1024 * 1024,
  };

  if (file.size > maxSizes[type]) {
    throw new Error(
      `Imagem muito grande. Máximo: ${maxSizes[type] / (1024 * 1024)}MB`,
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo deve ser uma imagem");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const result = await uploadImageAction(formData);

  if (!result.success) {
    throw new Error(result.error || "Erro ao fazer upload");
  }

  return result.url!;
}
