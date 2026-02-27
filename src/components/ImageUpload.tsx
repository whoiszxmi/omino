// components/ImageUpload.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface ImageUploadProps {
  type: "avatar" | "banner" | "wallpaper" | "post" | "wiki";
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  className?: string;
  preview?: boolean;
}

export function ImageUpload({
  type,
  currentUrl,
  onUpload,
  className,
  preview = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUrl || null,
  );
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizes = {
    avatar: 2,
    banner: 5,
    wallpaper: 10,
    post: 5,
    wiki: 5,
  };

  const aspectRatios = {
    avatar: "aspect-square",
    banner: "aspect-[3/1]",
    wallpaper: "aspect-video",
    post: "aspect-auto",
    wiki: "aspect-auto",
  };

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho
    const maxSize = maxSizes[type] * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Imagem muito grande. Máximo: ${maxSizes[type]}MB`);
      return;
    }

    // Preview local
    if (preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload
    await uploadImage(file);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (currentUrl) {
        formData.append("oldUrl", currentUrl);
      }

      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // ✅ SOLUÇÃO: Usar credentials: "include" para enviar cookies
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include", // ← CRÍTICO: Envia cookies automaticamente
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer upload");
      }

      const data = await response.json();

      // Mostrar economia de tamanho
      if (data.metadata?.savings) {
        toast.success(
          `Upload concluído! Economia de ${data.metadata.savings}% em tamanho`,
        );
      } else {
        toast.success("Upload concluído!");
      }

      onUpload(data.url);
      setPreviewUrl(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao fazer upload",
      );
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    onUpload("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative", className)}>
      {previewUrl ? (
        <div className="group relative overflow-hidden rounded-lg">
          <div className={cn("relative w-full", aspectRatios[type])}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>

          {/* Overlay com ações */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Trocar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="mr-2 h-4 w-4" />
              Remover
            </Button>
          </div>

          {/* Progresso de upload */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75">
              <div className="text-center">
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-white" />
                <p className="text-sm text-white">{progress}%</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full items-center justify-center rounded-lg border-2 border-dashed",
            "transition-colors hover:border-primary hover:bg-muted/50",
            aspectRatios[type],
            uploading && "cursor-not-allowed opacity-50",
          )}
        >
          {uploading ? (
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para fazer upload</p>
              <p className="text-xs text-muted-foreground">
                Máximo: {maxSizes[type]}MB
              </p>
            </div>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
}

/**
 * Componente simplificado para avatar
 */
export function AvatarUpload({
  currentUrl,
  onUpload,
}: {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
}) {
  return (
    <ImageUpload
      type="avatar"
      currentUrl={currentUrl}
      onUpload={onUpload}
      className="mx-auto w-32"
    />
  );
}

/**
 * Componente simplificado para banner
 */
export function BannerUpload({
  currentUrl,
  onUpload,
}: {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
}) {
  return (
    <ImageUpload
      type="banner"
      currentUrl={currentUrl}
      onUpload={onUpload}
      className="w-full"
    />
  );
}
