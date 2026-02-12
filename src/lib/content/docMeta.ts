export const DOC_BACKGROUND_PRESETS = [
  { label: "Neutro", value: "#1f2937" },
  { label: "Azul", value: "#1e3a8a" },
  { label: "Roxo", value: "#581c87" },
  { label: "Verde", value: "#14532d" },
  { label: "Âmbar", value: "#78350f" },
  { label: "Vermelho", value: "#7f1d1d" },
] as const;

export const DEFAULT_DOC_BACKGROUND = DOC_BACKGROUND_PRESETS[0].value;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unescapeHtml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

type BuildDocContentInput = {
  bodyHtml: string;
  title?: string | null;
  backgroundColor?: string | null;
};

export function buildDocContent({ bodyHtml, title, backgroundColor }: BuildDocContentInput) {
  const bg = backgroundColor ?? DEFAULT_DOC_BACKGROUND;
  const safeTitle = title?.trim() ? `<h2 data-doc-title="true">${escapeHtml(title.trim())}</h2>` : "";

  return `<section data-doc-bg="${bg}" style="background-color:${bg};padding:14px;border-radius:16px;">${safeTitle}${bodyHtml}</section>`;
}

export function parseDocContent(rawHtml: string) {
  const html = rawHtml ?? "";
  const wrapperMatch = html.match(/^\s*<section\s+[^>]*data-doc-bg="([^"]+)"[^>]*>([\s\S]*)<\/section>\s*$/i);

  if (!wrapperMatch) {
    return {
      title: "",
      backgroundColor: DEFAULT_DOC_BACKGROUND,
      bodyHtml: html,
    };
  }

  const backgroundColor = wrapperMatch[1] || DEFAULT_DOC_BACKGROUND;
  let inner = wrapperMatch[2] || "";

  let title = "";
  const titleMatch = inner.match(/^\s*<h2\s+[^>]*data-doc-title="true"[^>]*>([\s\S]*?)<\/h2>/i);
  if (titleMatch) {
    title = unescapeHtml(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    inner = inner.replace(/^\s*<h2\s+[^>]*data-doc-title="true"[^>]*>[\s\S]*?<\/h2>/i, "");
  }

  return {
    title,
    backgroundColor,
    bodyHtml: inner.trim(),
  };
}
