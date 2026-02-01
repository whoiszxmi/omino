import { supabase } from "@/lib/supabase/client";

export async function uploadPublicImage({
  file,
  bucket = "media",
  folder = "profiles",
}: {
  file: File;
  bucket?: string;
  folder?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Não logado.");

  const ext = file.name.split(".").pop() || "png";
  const path = `${folder}/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/*",
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
