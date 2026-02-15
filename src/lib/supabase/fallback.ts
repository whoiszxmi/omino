import type { PostgrestError } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/supabase/isMissingColumnError";

type QueryResult<T> = { data: T | null; error: PostgrestError | null };

export async function safeSelect<TWith, TFallback>(params: {
  primary: () => PromiseLike<QueryResult<TWith>>;
  fallback: () => PromiseLike<QueryResult<TFallback>>;
  missingColumn: string;
}) {
  const primaryRes = await params.primary();
  if (primaryRes.error && isMissingColumnError(primaryRes.error, params.missingColumn)) {
    // fallback para ambientes onde a coluna nova ainda não existe
    const fallbackRes = await params.fallback();
    return { data: fallbackRes.data, error: fallbackRes.error, usedFallback: true as const };
  }

  return { data: primaryRes.data, error: primaryRes.error, usedFallback: false as const };
}

export function pickData<T>(...results: Array<QueryResult<T> | null | undefined>) {
  for (const result of results) {
    if (!result) continue;
    if (!result.error) return result;
  }

  return results.find(Boolean) ?? { data: null, error: null };
}
