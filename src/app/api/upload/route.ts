// app/api/upload/route.ts - VERSÃO DEBUG
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // 🔍 DEBUG 1: Ver todos os cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log(
      "🍪 Todos os cookies:",
      allCookies.map((c) => c.name),
    );

    // 🔍 DEBUG 2: Criar cliente e verificar usuário
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    console.log("👤 User data:", {
      user: data.user?.id,
      email: data.user?.email,
      error: error?.message,
    });

    if (!data.user) {
      console.log("❌ Não autenticado!");
      console.log("Error details:", error);
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: {
            hasCookies: allCookies.length > 0,
            cookieNames: allCookies.map((c) => c.name),
            errorMessage: error?.message,
          },
        },
        { status: 401 },
      );
    }

    console.log("✅ Autenticado como:", data.user.email);

    // Retornar sucesso temporário para debug
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      message: "Debug: autenticação funcionando!",
    });
  } catch (error) {
    console.error("💥 Erro geral:", error);
    return NextResponse.json(
      {
        error: "Server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
