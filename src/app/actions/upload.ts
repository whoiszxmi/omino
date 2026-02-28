// app/actions/upload.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  uploadToR2,
  deleteFromR2,
  generateImagePath,
  extractR2Path,
} from "@/lib/storage/r2-client";
import {
  optimizeImage,
  validateImage,
  validateFileSize,
  getImageMetadata,
} from "@/lib/storage/image-optimizer";

type ImageType = "avatar" | "banner" | "wallpaper" | "post" | "wiki";

export async function uploadImageAction(formData: FormData) {
  try {
    console.log("🚀 Server Action: Iniciando upload...");

    // 1. Autenticação (MUITO MAIS SIMPLES!)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("❌ Usuário não autenticado");
      return {
        success: false,
        error: "Por favor, faça login novamente",
      };
    }

    console.log("✅ Usuário:", user.email);

    // 2. Obter dados
    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const oldUrl = formData.get("oldUrl") as string | null;

    if (!file) {
      return { success: false, error: "Nenhum arquivo fornecido" };
    }

    console.log("📁 Arquivo:", file.name, file.size);

    // 3. Validar tamanho
    if (!validateFileSize(file.size, type)) {
      return { success: false, error: "Arquivo muito grande" };
    }

    // 4. Converter e validar
    const buffer = Buffer.from(await file.arrayBuffer());
    const isValid = await validateImage(buffer);

    if (!isValid) {
      return { success: false, error: "Arquivo de imagem inválido" };
    }

    console.log("✅ Imagem válida");

    // 5. Otimizar
    const metadata = await getImageMetadata(buffer);
    const optimized = await optimizeImage(buffer, {
      type,
      quality: 85,
      format: "webp",
    });

    console.log("✅ Otimizada:", {
      original: file.size,
      otimizado: optimized.length,
      economia: Math.round((1 - optimized.length / file.size) * 100) + "%",
    });

    // 6. Upload para R2
    const path = generateImagePath(user.id, type);
    const url = await uploadToR2({
      file: optimized,
      path,
      contentType: "image/webp",
    });

    console.log("✅ Upload concluído:", url);

    // 7. Deletar antiga
    if (oldUrl) {
      const oldPath = extractR2Path(oldUrl);
      if (oldPath) {
        try {
          await deleteFromR2(oldPath);
          console.log("✅ Imagem antiga deletada");
        } catch (error) {
          console.error("⚠️ Erro ao deletar antiga:", error);
        }
      }
    }

    // 8. Retornar sucesso
    return {
      success: true,
      url,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        originalSize: file.size,
        optimizedSize: optimized.length,
        savings: Math.round((1 - optimized.length / file.size) * 100),
      },
    };
  } catch (error) {
    console.error("💥 Erro no upload:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer upload",
    };
  }
}
