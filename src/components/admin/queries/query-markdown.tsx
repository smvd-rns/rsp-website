"use client";

import MarkdownIt from "markdown-it";
import { useMemo } from "react";

interface QueryMarkdownProps {
  content: string;
  className?: string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

// Configure links to open in a new tab safely
const defaultRender =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs ? String(token.attrs[hrefIndex][1]) : "";
    if (!href.startsWith("/") && !href.startsWith("#")) {
      token.attrPush(["target", "_blank"]);
      token.attrPush(["rel", "noopener noreferrer"]);
    }
  }
  token.attrJoin(
    "class",
    "text-primary font-medium underline underline-offset-2",
  );
  return defaultRender(tokens, idx, options, env, self);
};

export const QueryMarkdown = ({
  content,
  className = "",
}: QueryMarkdownProps) => {
  const html = useMemo(() => {
    if (!content) return "";
    return md.render(content);
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={`text-sm leading-relaxed text-foreground [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:text-xs [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 ${className}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with html: false in markdown-it
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
