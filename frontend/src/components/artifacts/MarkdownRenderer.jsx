import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiFileText } from "react-icons/fi";

/**
 * MarkdownRenderer — fallback renderer for generic/other artifacts.
 * Mirrors the chat Markdown styling used in MessageBubble.
 */
export default function MarkdownRenderer({ artifact }) {
  const content = artifact.metadata?.text || "";
  const name = artifact.name || (content ? "Document" : "Artifact");

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#121622] border-b border-white/[0.06] text-xs text-slate-300">
        <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-400">
          <FiFileText className="w-3.5 h-3.5" />
        </span>
        <span className="font-medium truncate">{name}</span>
      </div>
      {content ? (
        <div className="px-4 py-3 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-headings:text-slate-100 prose-a:text-indigo-400">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-xs text-slate-400">
          No preview available for this artifact.
        </div>
      )}
    </div>
  );
}