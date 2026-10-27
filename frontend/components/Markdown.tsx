"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const inline = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

const toHtml = (markdown: string) => {
  const lines = (markdown || "").split("\n");
  const output: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      return;
    }
    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);

    if (bullet) {
      if (listType !== "ul") {
        closeList();
        output.push("<ul>");
        listType = "ul";
      }
      output.push(`<li>${inline(bullet[1])}</li>`);
      return;
    }
    if (numbered) {
      if (listType !== "ol") {
        closeList();
        output.push("<ol>");
        listType = "ol";
      }
      output.push(`<li>${inline(numbered[1])}</li>`);
      return;
    }
    closeList();
    if (heading) {
      const level = Math.min(5, heading[1].length + 2);
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      return;
    }
    output.push(`<p>${inline(trimmed)}</p>`);
  });
  closeList();
  return output.join("");
};

export function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => toHtml(content), [content]);
  return <div className={cn("markdown space-y-1.5 [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-white [&_h4]:font-semibold [&_h4]:text-slate-200 [&_p]:leading-relaxed", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
