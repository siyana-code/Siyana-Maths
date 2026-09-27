"use client";

import katex from "katex";
import { useMemo } from "react";

import "katex/dist/katex.min.css";

type MathProps = {
  /** A LaTeX fragment. `$$` delimiters are optional and stripped. */
  tex: string;
  display?: boolean;
  className?: string;
};

/**
 * Renders LaTeX with KaTeX. Rendering never throws into the tree: a malformed
 * expression shows the raw source instead of breaking the page.
 */
export function Math({ tex, display = false, className }: MathProps) {
  const source = useMemo(() => stripDelimiters(tex), [tex]);

  const html = useMemo(() => {
    if (!source.trim()) return "";
    try {
      return katex.renderToString(source, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: false,
        output: "html",
        macros: {
          "\\sin": "\\sin",
          "\\RR": "\\mathbb{R}",
        },
      });
    } catch {
      return null;
    }
  }, [source, display]);

  if (!source.trim()) return null;

  if (html === null) {
    return <code className="math-fallback">{source}</code>;
  }

  return (
    <span
      className={`math-render${display ? " math-render--display" : ""}${className ? ` ${className}` : ""}`}
      // KaTeX output is generated locally from author input with trust disabled,
      // so it cannot introduce script or style injection.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function stripDelimiters(tex: string): string {
  return tex
    .trim()
    .replace(/^\$\$/, "")
    .replace(/\$\$$/, "")
    .replace(/^\$/, "")
    .replace(/\$$/, "")
    .trim();
}

/** Splits a mixed string into plain text and math segments for rendering. */
export function splitMathSegments(value: string): { type: "text" | "math"; value: string }[] {
  const segments: { type: "text" | "math"; value: string }[] = [];
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    segments.push({ type: "math", value: (match[1] ?? match[2] ?? "").trim() });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    segments.push({ type: "text", value: value.slice(lastIndex) });
  }
  return segments;
}
