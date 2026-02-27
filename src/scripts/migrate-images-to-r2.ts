// scripts/migrate-images-to-r2.ts
/**
 * Script para migrar imagens existentes do Supabase Storage para Cloudflare R2
 *
 * Uso:
 * npx tsx scripts/migrate-images-to-r2.ts
 */

import { createClient } from "@supabase/supabase-js";
import { uploadToR2, generateImagePath } from "../lib/storage/r2-client";
import { optimizeImage } from "../lib/storage/image-optimizer";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  bandwidth: number;
}

async function migrateImages() {
  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    bandwidth: 0,
  };

  console.log("🚀 Iniciando migração de imagens...\n");

  // 1. Migrar avatares de perfil
  console.log("📸 Migrando avatares...");
  await migrateProfileImages("avatar_url", "avatar", stats);

  // 2. Migrar banners de perfil
  console.log("\n🎨 Migrando banners...");
  await migrateProfileImages("banner_url", "banner", stats);

  // 3. Migrar wallpapers de chat
  console.log("\n🖼️  Migrando wallpapers de chat...");
  await migrateChatWallpapers(stats);

  // 4. Migrar capas de wiki
  console.log("\n📚 Migrando capas de wiki...");
  await migrateWikiCovers(stats);

  // 5. Migrar wallpapers de posts
  console.log("\n📝 Migrando wallpapers de posts...");
  await migratePostWallpapers(stats);

  // Resumo
  console.log("\n" + "=".repeat(50));
  console.log("📊 Resumo da Migração:");
  console.log("=".repeat(50));
  console.log(`Total de imagens: ${stats.total}`);
  console.log(`✅ Sucesso: ${stats.success}`);
  console.log(`❌ Falhas: ${stats.failed}`);
  console.log(`📊 Banda economizada: ${formatBytes(stats.bandwidth)}`);
  console.log("=".repeat(50));
}

async function migrateProfileImages(
  column: "avatar_url" | "banner_url",
  type: "avatar" | "banner",
  stats: MigrationStats,
) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`id, ${column}`)
    .not(column, "is", null);

  if (error) {
    console.error("Erro ao buscar perfis:", error);
    return;
  }

  for (const profile of profiles || []) {
    const oldUrl = profile[column];
    if (!oldUrl) continue;

    stats.total++;

    try {
      // Download da imagem
      const response = await fetch(oldUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      const originalSize = buffer.length;

      // Otimizar
      const optimized = await optimizeImage(buffer, { type });

      // Upload para R2
      const path = generateImagePath(profile.id, type);
      const newUrl = await uploadToR2({
        file: optimized,
        path,
        contentType: "image/webp",
      });

      // Atualizar banco
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [column]: newUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      stats.success++;
      stats.bandwidth += originalSize;

      const savings = Math.round((1 - optimized.length / originalSize) * 100);
      console.log(
        `  ✅ ${profile.id.substring(0, 8)}... | ${formatBytes(originalSize)} → ${formatBytes(optimized.length)} (${savings}% economia)`,
      );
    } catch (error) {
      stats.failed++;
      console.error(`  ❌ ${profile.id}: ${error}`);
    }
  }
}

async function migrateChatWallpapers(stats: MigrationStats) {
  // Buscar chats com wallpaper_id (wallpapers personalizados do Supabase Storage)
  const { data: chats, error } = await supabase
    .from("chats")
    .select("id, wallpaper_id")
    .not("wallpaper_id", "is", null);

  if (error) {
    console.error("Erro ao buscar chats:", error);
    return;
  }

  for (const chat of chats || []) {
    if (!chat.wallpaper_id) continue;

    stats.total++;

    try {
      // Download do Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from("wallpapers")
        .download(chat.wallpaper_id);

      if (downloadError) throw downloadError;

      const buffer = Buffer.from(await data.arrayBuffer());
      const originalSize = buffer.length;

      // Otimizar
      const optimized = await optimizeImage(buffer, { type: "wallpaper" });

      // Upload para R2
      const path = `wallpapers/chat-${chat.id}/${Date.now()}.webp`;
      const newUrl = await uploadToR2({
        file: optimized,
        path,
        contentType: "image/webp",
      });

      // Atualizar banco (usar wallpaper_slug para armazenar URL do R2)
      const { error: updateError } = await supabase
        .from("chats")
        .update({
          wallpaper_slug: newUrl,
          wallpaper_id: null, // Limpar referência antiga
        })
        .eq("id", chat.id);

      if (updateError) throw updateError;

      // Deletar do Supabase Storage
      await supabase.storage.from("wallpapers").remove([chat.wallpaper_id]);

      stats.success++;
      stats.bandwidth += originalSize;

      console.log(`  ✅ Chat ${chat.id.substring(0, 8)}... migrado`);
    } catch (error) {
      stats.failed++;
      console.error(`  ❌ Chat ${chat.id}: ${error}`);
    }
  }
}

async function migrateWikiCovers(stats: MigrationStats) {
  const { data: wikis, error } = await supabase
    .from("wiki_pages")
    .select("id, cover_url, created_by_persona_id")
    .not("cover_url", "is", null);

  if (error) {
    console.error("Erro ao buscar wikis:", error);
    return;
  }

  for (const wiki of wikis || []) {
    if (!wiki.cover_url) continue;

    stats.total++;

    try {
      const response = await fetch(wiki.cover_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      const originalSize = buffer.length;

      const optimized = await optimizeImage(buffer, { type: "wiki" });

      const path = `wikis/${wiki.created_by_persona_id}/${wiki.id}.webp`;
      const newUrl = await uploadToR2({
        file: optimized,
        path,
        contentType: "image/webp",
      });

      const { error: updateError } = await supabase
        .from("wiki_pages")
        .update({ cover_url: newUrl })
        .eq("id", wiki.id);

      if (updateError) throw updateError;

      stats.success++;
      stats.bandwidth += originalSize;

      console.log(`  ✅ Wiki ${wiki.id.substring(0, 8)}... migrada`);
    } catch (error) {
      stats.failed++;
      console.error(`  ❌ Wiki ${wiki.id}: ${error}`);
    }
  }
}

async function migratePostWallpapers(stats: MigrationStats) {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, wallpaper_id, persona_id")
    .not("wallpaper_id", "is", null);

  if (error) {
    console.error("Erro ao buscar posts:", error);
    return;
  }

  for (const post of posts || []) {
    if (!post.wallpaper_id) continue;

    stats.total++;

    try {
      const { data, error: downloadError } = await supabase.storage
        .from("wallpapers")
        .download(post.wallpaper_id);

      if (downloadError) throw downloadError;

      const buffer = Buffer.from(await data.arrayBuffer());
      const originalSize = buffer.length;

      const optimized = await optimizeImage(buffer, { type: "post" });

      const path = `posts/${post.persona_id}/${post.id}.webp`;
      const newUrl = await uploadToR2({
        file: optimized,
        path,
        contentType: "image/webp",
      });

      const { error: updateError } = await supabase
        .from("posts")
        .update({
          wallpaper_slug: newUrl,
          wallpaper_id: null,
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      await supabase.storage.from("wallpapers").remove([post.wallpaper_id]);

      stats.success++;
      stats.bandwidth += originalSize;

      console.log(`  ✅ Post ${post.id.substring(0, 8)}... migrado`);
    } catch (error) {
      stats.failed++;
      console.error(`  ❌ Post ${post.id}: ${error}`);
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Executar migração
migrateImages().catch(console.error);
