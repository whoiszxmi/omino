import DOMPurify from "isomorphic-dompurify";

export function renderRichHtml(input: string) {
  // 1) Converte tag movível [img:URL] -> <img>
  const withTags = (input ?? "").replace(
    /\[img:(https?:\/\/[^\]\s]+)\]/g,
    (_m, url) =>
      `<img src="${url}" alt="image" class="max-w-full h-auto rounded-xl" />`,
  );

  // 2) Sanitiza e garante que <img> e attrs necessários sejam preservados
  return DOMPurify.sanitize(withTags, {
    ADD_TAGS: ["img"],
    ADD_ATTR: ["src", "alt", "title", "class"],
  });
}
