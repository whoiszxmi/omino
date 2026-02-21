const MEDIA_TAGS_REGEX = /<(img|video|iframe)\b/i;
const MENTION_REGEX = /(data-mention|data-type=["']mention["']|class=["'][^"']*mention)/i;

function stripTextContent(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichHtmlEmpty(html: string) {
  const normalized = (html ?? "").trim();
  if (!normalized) return true;

  if (MEDIA_TAGS_REGEX.test(normalized)) return false;
  if (MENTION_REGEX.test(normalized)) return false;

  const text = stripTextContent(normalized);
  return text.length === 0;
}
