import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
    // 1. Pegar token do header Authorization
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ No Authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Criar cliente Supabase e validar token
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Invalid token:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Authenticated as:", user.email);

    // 3. Obter dados do form
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const oldUrl = formData.get("oldUrl") as string | null;

    // 4. Validações básicas
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type as any)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 5. Validar tamanho
    if (!validateFileSize(file.size, type)) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // 6. Converter para buffer e validar imagem
    const buffer = Buffer.from(await file.arrayBuffer());
    const isValid = await validateImage(buffer);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 },
      );
    }

    // 7. Obter metadados
    const metadata = await getImageMetadata(buffer);

    // 8. Otimizar imagem
    const optimized = await optimizeImage(buffer, {
      type,
      quality: 85,
      format: "webp",
    });

    // 9. Gerar path e fazer upload
    const path = generateImagePath(user.id, type);
    const url = await uploadToR2({
      file: optimized,
      path,
      contentType: "image/webp",
    });

    // 10. Deletar imagem antiga se existir
    if (oldUrl) {
      const oldPath = extractR2Path(oldUrl);
      if (oldPath) {
        try {
          await deleteFromR2(oldPath);
        } catch (error) {
          console.error("Failed to delete old image:", error);
        }
      }
    }

    // 11. Retornar sucesso
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

export async function DELETE(request: NextRequest) {
  try {
    // 1. Pegar token do header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Validar token
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Obter URL da query
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const path = extractR2Path(url);
    if (!path) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // 4. Verificar se o path pertence ao usuário
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
