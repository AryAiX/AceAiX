import React, { useMemo } from 'react';

/**
 * The four legal documents, rendered on the web from the app's own source.
 *
 * Two versions of a privacy policy that disagree is worse than one that is
 * late, and a store reviewer will open both. So the text lives in exactly one
 * place — `mobile/lib/legal/` — and this renders the same Markdown subset the
 * app's `components/settings/LegalDocument.tsx` renders: `#`/`##`/`###`
 * headings, blank-line separated paragraphs, `-` bullets, `**bold**` and
 * `[text](url)`. Nothing else, deliberately: a document that needs a table is
 * a document that has stopped being readable on a phone.
 */

type Block =
  | { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push({ kind: 'ul', items: bullets });
      bullets = [];
    }
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();

    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();

    if (!line.trim()) continue;
    if (line.startsWith('### ')) blocks.push({ kind: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ kind: 'h2', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ kind: 'h1', text: line.slice(2) });
    else blocks.push({ kind: 'p', text: line });
  }
  flush();
  return blocks;
}

/** `**bold**` and `[text](url)`, in one pass, without a Markdown dependency. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    index += 1;

    if (match[1]) {
      nodes.push(
        <strong key={`${keyPrefix}-b${index}`} className="font-semibold text-white">
          {match[1]}
        </strong>,
      );
    } else {
      const href = match[3];
      const external = /^https?:/.test(href);
      nodes.push(
        <a
          key={`${keyPrefix}-a${index}`}
          href={href}
          className="text-orange-400 underline underline-offset-2 hover:text-orange-300"
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {match[2]}
        </a>,
      );
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export default function LegalDocument({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parse(markdown), [markdown]);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-slate-300">
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case 'h1':
            return (
              <h1 key={key} className="mb-6 text-4xl font-extrabold tracking-tight text-white">
                {block.text}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={key} className="mt-12 mb-4 text-2xl font-bold text-white">
                {inline(block.text, key)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={key} className="mt-8 mb-3 text-lg font-semibold text-white">
                {inline(block.text, key)}
              </h3>
            );
          case 'ul':
            return (
              <ul key={key} className="my-4 space-y-2 pl-5">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="list-disc leading-relaxed marker:text-orange-500">
                    {inline(item, `${key}-${j}`)}
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={key} className="my-4 leading-relaxed">
                {inline(block.text, key)}
              </p>
            );
        }
      })}
    </article>
  );
}
