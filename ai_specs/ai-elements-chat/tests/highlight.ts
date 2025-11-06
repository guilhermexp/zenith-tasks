import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";
import type { Element } from "hast";

/**
 * Line number transformer for code blocks
 */
export const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node: Element, line: number) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

/**
 * Highlights code using Shiki with github-dark theme for neutral colors
 * Returns [lightThemeHtml, darkThemeHtml]
 */
export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
): Promise<[string, string]> {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "github-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "github-dark",
      transformers,
    }),
  ]);
}
