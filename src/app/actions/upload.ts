// app/actions/upload.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("❌ Usuário não autenticado");
      console.log(
        "Cookies disponíveis:",
        cookieStore.getAll().map((c) => c.name),
      );
      return {
        success: false,
        error: "Por favor, faça login novamente",
      };
    }

    console.log("✅ Usuário:", user.email);

    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const oldUrl = formData.get("oldUrl") as string | null;

    if (!file) {
      return { success: false, error: "Nenhum arquivo fornecido" };
    }

    console.log("📁 Arquivo:", file.name, file.size);

    if (!validateFileSize(file.size, type)) {
      return { success: false, error: "Arquivo muito grande" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isValid = await validateImage(buffer);

    if (!isValid) {
      return { success: false, error: "Arquivo de imagem inválido" };
    }

    const metadata = await getImageMetadata(buffer);
    const optimized = await optimizeImage(buffer, {
      type,
      quality: 85,
      format: "webp",
    });

    const path = generateImagePath(user.id, type);
    const url = await uploadToR2({
      file: optimized,
      path,
      contentType: "image/webp",
    });

    console.log("✅ Upload concluído:", url);

    if (oldUrl) {
      const oldPath = extractR2Path(oldUrl);
      if (oldPath) {
        try {
          await deleteFromR2(oldPath);
        } catch (error) {
          console.error("⚠️ Erro ao deletar antiga:", error);
        }
      }
    }

    return {
      success: true,
      url: String(url),
      metadata: {
        width: Number(metadata.width) || 0,
        height: Number(metadata.height) || 0,
        format: String(metadata.format || "webp"),
        originalSize: Number(file.size),
        optimizedSize: Number(optimized.length),
        savings: Number(Math.round((1 - optimized.length / file.size) * 100)),
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
