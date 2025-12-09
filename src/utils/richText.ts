/**
 * Rich text utilities for TipTap integration
 * Handles conversion between plain text and HTML content
 */

/**
 * Checks if content appears to be HTML
 */
export function isHtmlContent(content: string | undefined | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.startsWith('<') && trimmed.includes('>');
}

/**
 * Ensures content is valid HTML for TipTap
 * Converts plain text to HTML if needed
 */
export function ensureHtml(content: string | undefined | null): string {
  if (!content) return '';

  const trimmed = content.trim();
  if (!trimmed) return '';

  // Already HTML (starts with tag)
  if (isHtmlContent(trimmed)) {
    return trimmed;
  }

  // Convert plain text to HTML
  // Escape HTML special characters
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Convert newlines to paragraph breaks
  const paragraphs = escaped
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, '<br>'))
    .filter(p => p.trim())
    .map(p => `<p>${p}</p>`)
    .join('');

  return paragraphs || `<p>${escaped}</p>`;
}

/**
 * Extracts plain text from HTML for display/search
 */
export function extractPlainText(html: string | undefined | null): string {
  if (!html) return '';

  // If not HTML, return as-is
  if (!isHtmlContent(html)) {
    return html.trim();
  }

  // Use browser DOMParser if available (client-side)
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    } catch {
      // Fallback on parse error
    }
  }

  // Fallback: strip tags with regex (works on server-side too)
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\n+/g, '\n')
    .trim();
}

/**
 * Truncates HTML content while preserving readable text
 * Returns plain text truncated to maxLength
 */
export function truncateHtml(html: string | undefined | null, maxLength: number): string {
  const plainText = extractPlainText(html);
  if (plainText.length <= maxLength) return plainText;

  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Checks if HTML content is empty (no actual text content)
 */
export function isEmptyHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  const plainText = extractPlainText(html);
  return plainText.length === 0;
}
