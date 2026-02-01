"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Category = { id: string; name: string };

export default function CategorySelect({
  value,
  onChange,
  includeNone = true,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  includeNone?: boolean;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("wiki_categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) console.error("ERRO categories:", error);
      setCats((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <select
      className="h-10 w-full rounded-2xl border bg-background px-3 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      disabled={loading}
    >
      {includeNone && <option value="">{loading ? "Carregando..." : "Sem categoria"}</option>}
      {cats.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
