// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
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
  ImageType,
} from "@/lib/storage/image-optimizer";

const ALLOWED_TYPES = [
  "avatar",
  "banner",
  "wallpaper",
  "post",
  "wiki",
] as const;

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Obter dados do form
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const oldUrl = formData.get("oldUrl") as string | null;

    // 3. Validações básicas
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type as any)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 4. Validar tamanho
    if (!validateFileSize(file.size, type)) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // 5. Converter para buffer e validar imagem
    const buffer = Buffer.from(await file.arrayBuffer());
    const isValid = await validateImage(buffer);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 },
      );
    }

    // 6. Obter metadados
    const metadata = await getImageMetadata(buffer);

    // 7. Otimizar imagem
    const optimized = await optimizeImage(buffer, {
      type,
      quality: 85,
      format: "webp",
    });

    // 8. Gerar path e fazer upload
    const path = generateImagePath(user.id, type);
    const url = await uploadToR2({
      file: optimized,
      path,
      contentType: "image/webp",
    });

    // 9. Deletar imagem antiga se existir
    if (oldUrl) {
      const oldPath = extractR2Path(oldUrl);
      if (oldPath) {
        try {
          await deleteFromR2(oldPath);
        } catch (error) {
          console.error("Failed to delete old image:", error);
          // Não falhar o request por isso
        }
      }
    }

    // 10. Retornar sucesso com metadados
    return NextResponse.json({
      url,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        originalSize: file.size,
        optimizedSize: optimized.length,
        savings: Math.round((1 - optimized.length / file.size) * 100),
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// Deletar imagem
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const path = extractR2Path(url);
    if (!path) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Verificar se o path pertence ao usuário
    if (
      !path.startsWith(`avatars/${user.id}/`) &&
      !path.startsWith(`banners/${user.id}/`) &&
      !path.startsWith(`wallpapers/${user.id}/`) &&
      !path.startsWith(`posts/${user.id}/`) &&
      !path.startsWith(`wikis/${user.id}/`)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteFromR2(path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
