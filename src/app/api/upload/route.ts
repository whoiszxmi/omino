// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
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

/**
 * ✅ Helper para criar cliente Supabase autenticado
 * Next.js 15+ - cookies() é async!
 */
async function createAuthenticatedClient(): Promise<SupabaseClient | null> {
  const cookieStore = await cookies(); // ← AWAIT aqui!

  // Tentar diferentes nomes de cookies
  const cookieNames = [
    "sb-access-token",
    "sb-localhost-auth-token",
    "supabase-auth-token",
  ];

  let accessToken: string | undefined;

  // Procurar nos cookies específicos
  for (const name of cookieNames) {
    const cookie = cookieStore.get(name);
    if (cookie?.value) {
      accessToken = cookie.value;
      console.log(`✅ Token encontrado em: ${name}`);
      break;
    }
  }

  // Se não encontrou, procurar em TODOS os cookies
  if (!accessToken) {
    const allCookies = cookieStore.getAll();
    console.log("📍 Procurando em todos os cookies:", allCookies.length);

    for (const cookie of allCookies) {
      if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
        console.log(`🔍 Cookie potencial: ${cookie.name}`);
        accessToken = cookie.value;
        break;
      }
    }
  }

  if (!accessToken) {
    console.log("❌ Nenhum token de auth encontrado");
    return null;
  }

  // Criar cliente com token
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return client;
}

export async function POST(request: NextRequest) {
  try {
    console.log("📍 1. POST /api/upload - Iniciando...");

    // 1. Criar cliente autenticado
    const supabase = await createAuthenticatedClient(); // ← AWAIT aqui!

    if (!supabase) {
      console.log("❌ Não foi possível criar cliente autenticado");
      return NextResponse.json(
        { error: "No authentication found. Please login again." },
        { status: 401 },
      );
    }

    console.log("📍 2. Cliente criado, validando usuário...");

    // 2. Validar usuário
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data?.user) {
      console.log("❌ Erro de autenticação:", authError?.message);
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: authError?.message,
        },
        { status: 401 },
      );
    }

    const user = data.user;
    console.log("✅ Usuário autenticado:", user.email);

    // 3. Obter dados do form
    console.log("📍 3. Lendo FormData...");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as ImageType;
    const oldUrl = formData.get("oldUrl") as string | null;

    console.log("📍 4. Dados recebidos:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      type,
    });

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
    console.log("📍 5. Validando imagem...");
    const buffer = Buffer.from(await file.arrayBuffer());
    const isValid = await validateImage(buffer);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 },
      );
    }

    // 7. Obter metadados
    console.log("📍 6. Obtendo metadados...");
    const metadata = await getImageMetadata(buffer);

    // 8. Otimizar imagem
    console.log("📍 7. Otimizando imagem...");
    const optimized = await optimizeImage(buffer, {
      type,
      quality: 85,
      format: "webp",
    });

    console.log("✅ Otimização concluída:", {
      originalSize: file.size,
      optimizedSize: optimized.length,
      savings: Math.round((1 - optimized.length / file.size) * 100) + "%",
    });

    // 9. Gerar path e fazer upload
    console.log("📍 8. Fazendo upload para R2...");
    const path = generateImagePath(user.id, type);
    const url = await uploadToR2({
      file: optimized,
      path,
      contentType: "image/webp",
    });

    console.log("✅ Upload concluído! URL:", url);

    // 10. Deletar imagem antiga se existir
    if (oldUrl) {
      console.log("📍 9. Deletando imagem antiga...");
      const oldPath = extractR2Path(oldUrl);
      if (oldPath) {
        try {
          await deleteFromR2(oldPath);
          console.log("✅ Imagem antiga deletada");
        } catch (error) {
          console.error("⚠️ Falha ao deletar imagem antiga:", error);
        }
      }
    }

    // 11. Retornar sucesso
    console.log("✅ Upload completo com sucesso!");
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
    console.error("💥 Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("📍 DELETE /api/upload - Iniciando...");

    const supabase = await createAuthenticatedClient(); // ← AWAIT aqui!

    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = data.user;
    console.log("✅ User autenticado:", user.email);

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
    const userPaths = [
      `avatars/${user.id}/`,
      `banners/${user.id}/`,
      `wallpapers/${user.id}/`,
      `posts/${user.id}/`,
      `wikis/${user.id}/`,
    ];

    const belongsToUser = userPaths.some((prefix) => path.startsWith(prefix));

    if (!belongsToUser) {
      console.log("❌ Path não pertence ao usuário");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteFromR2(path);
    console.log("✅ Imagem deletada com sucesso");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("💥 Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
