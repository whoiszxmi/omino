import DOMPurify from "isomorphic-dompurify";

/**
 * Converte tags estilo Amino:
 *  - [img:https://...] => <img src="...">
 * e sanitiza o HTML final.
 */
export function renderRichHtml(inputHtml: string) {
  const raw = inputHtml || "";

  // 1) converte [img:URL] em HTML
  // aceita http/https e urls do supabase storage
  const withImages = raw.replace(
    /\[img:(https?:\/\/[^\]\s]+)\]/gim,
    (_m, url) =>
      `<img src="${url}" alt="image" class="max-w-full h-auto rounded-xl border" />`,
  );

  // 2) sanitiza (mantém tags úteis)
  return DOMPurify.sanitize(withImages, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "section",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "class",
      "style",
      "data-doc-bg",
      "data-doc-title",
    ],
  });
}
