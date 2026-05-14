'use client';

import { sanitizeHtml } from '@/lib/legal/sanitize-html';

type Tag = 'div' | 'span' | 'section' | 'article' | 'aside' | 'p';

interface SafeHtmlProps extends React.HTMLAttributes<HTMLElement> {
  html: string;
  as?: Tag;
}

// Centralised sanitizer wrapper. Always pipes input through sanitizeHtml() so
// callers can't accidentally render unsanitized markup with dangerouslySetInnerHTML.
export function SafeHtml({ html, as = 'div', ...rest }: SafeHtmlProps) {
  const Tag = as as Tag;
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
