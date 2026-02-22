import DOMPurify from "isomorphic-dompurify";

/**
 * Cores consideradas "claras" (fundos que precisam de texto escuro).
 */
const LIGHT_BACKGROUNDS = new Set([
  "#f8fafc", // paper
  "#fef9f0", // sand
  "#f1f5f9", // fog
  "paper",
  "sand",
  "fog",
]);

function isLightBackground(bgValue: string): boolean {
  return LIGHT_BACKGROUNDS.has(bgValue.toLowerCase().trim());
}

/**
 * Fix tipografia escura em fundo escuro.
 *
 * O problema anterior: injetávamos color apenas na <section>, mas o Tailwind
 * `.prose` aplica cores em p, h1, h2, strong, etc. com especificidade maior,
 * sobrescrevendo o color herdado.
 *
 * Solução: além de colorir a section, injetamos também `color: inherit` em
 * todos os filhos diretos relevantes via um atributo data-doc-text que o CSS
 * global captura — e adicionamos `color` inline na section com `!important`
 * para garantir cascata correta mesmo dentro do .prose.
 */
function fixDocSectionColors(html: string): string {
  return html.replace(
    /(<section\s+[^>]*data-doc-bg="([^"]+)"[^>]*style=")([^"]*?)(")/gi,
    (_match, open, bgValue, existingStyle, close) => {
      const isLight = isLightBackground(bgValue);
      const textColor = isLight ? "#1f2937" : "#f1f5f9";
      const textColorImportant = isLight
        ? "color:#1f2937 !important;"
        : "color:#f1f5f9 !important;";

      // Substitui qualquer color existente ou insere no início
      const newStyle = existingStyle.includes("color:")
        ? existingStyle.replace(/color:[^;]+;?/g, textColorImportant)
        : textColorImportant + existingStyle;

      // Adiciona data-doc-text para o CSS global capturar os filhos
      const dataAttr = isLight
        ? `data-doc-text="dark"`
        : `data-doc-text="light"`;

      // Insere o data-doc-text na abertura da tag (antes do style=)
      const openWithData = open.replace(
        /(<section\s+[^>]*?)(style=")/i,
        `$1${dataAttr} $2`,
      );

      return `${openWithData}${newStyle}${close}`;
    },
  );
}

/**
 * Renderiza apenas o corpo do conteúdo, sem o wrapper <section data-doc-bg>.
 * Use isto nas páginas de visualização de post/wiki onde o fundo já é
 * controlado pelo WallpaperBackground ou pela cor do wallpaper da página.
 */
export function renderBodyHtml(inputHtml: string): string {
  const raw = inputHtml || "";
  // remove o wrapper <section data-doc-bg=...>...</section> se existir
  const match = raw.match(
    /^\s*<section\s+[^>]*data-doc-bg="[^"]*"[^>]*>([\s\S]*)<\/section>\s*$/i,
  );
  const body = match ? match[1].trim() : raw;
  return renderRichHtml(body);
}

/**
 * Converte tags estilo Amino e sanitiza HTML.
 * Também corrige cores de texto em sections com fundo escuro/claro.
 */
export function renderRichHtml(inputHtml: string) {
  const raw = inputHtml || "";

  // 1) converte [img:URL] em HTML
  const withImages = raw.replace(
    /\[img:(https?:\/\/[^\]\s]+)\]/gim,
    (_m, url) =>
      `<img src="${url}" alt="image" class="max-w-full h-auto rounded-xl border" />`,
  );

  // 2) sanitiza
  const sanitized = DOMPurify.sanitize(withImages, {
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
      "data-doc-text",
    ],
  });

  // 3) injeta cor de texto correta com !important para vencer o .prose
  return fixDocSectionColors(sanitized);
}
