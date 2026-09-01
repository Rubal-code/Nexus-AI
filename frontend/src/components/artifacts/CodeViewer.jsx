import React, { useMemo, useState } from "react";
import { FiCopy, FiCheck, FiDownload, FiFileText, FiTerminal } from "react-icons/fi";
import { downloadBlob } from "../../features/chatApi";

/**
 * CodeViewer — read-only source code panel for non-browser languages
 * (Python and other back-end languages). Shows code plus execution output
 * when server-side execution metadata exists, otherwise clearly labels it
 * as source code (no fake browser preview).
 */
export default function CodeViewer({ artifact }) {
  const [copied, setCopied] = useState(false);
  const files = artifact.metadata?.files || [];
  const codeBlocks = artifact.metadata?.code || [];
  const execution = artifact.metadata?.execution;

  const items = useMemo(() => {
    if (codeBlocks.length) {
      return codeBlocks.map((b, i) => ({
        language: b.language || "text",
        filename: files[i]?.filename || `file-${i + 1}.txt`,
        content: b.content || "",
      }));
    }
    return files.map((f, i) => ({
      language: f.language || "text",
      filename: f.filename || `file-${i + 1}.txt`,
      content: f.content || "",
    }));
  }, [codeBlocks, files]);

  const [activeIdx, setActiveIdx] = useState(0);
  const active = items[activeIdx] || items[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(active?.content || "");
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    downloadBlob({
      blob: new Blob([items.map((f) => f.content).join("\n\n")], { type: "text/plain" }),
      filename: artifact?.name || `nexus-code-${Date.now()}.txt`,
    });
  };

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="p-1 rounded-md bg-cyan-500/15 text-cyan-400 shrink-0">
            <FiTerminal className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {active?.filename || artifact?.name || "Source code"}
            </p>
            <p className="text-[10px] text-slate-500">
              {active?.language || "text"} · source code (not browser-executable)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            {copied ? <FiCheck className="w-3 h-3 text-emerald-400" /> : <FiCopy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <FiDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* File tabs */}
      {items.length > 1 && (
        <div className="flex items-center gap-0.5 px-2 pt-2 bg-[#0a0d14] border-b border-white/[0.05] overflow-x-auto custom-scrollbar">
          {items.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1 px-2 py-1 rounded-t-md text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                i === activeIdx
                  ? "bg-[#141824] text-cyan-200 border border-b-0 border-white/[0.08]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FiFileText className="w-2.5 h-2.5" />
              {f.filename}
            </button>
          ))}
        </div>
      )}

      {/* Code body */}
      <pre className="max-h-[420px] overflow-auto custom-scrollbar p-3 text-xs font-mono leading-relaxed text-slate-200 bg-[#0a0d14]">
        <code>{active?.content || "// no code"}</code>
      </pre>

      {/* Execution output panel (only when server-side execution metadata exists) */}
      {execution && (
        <div className="border-t border-white/[0.06] bg-[#0d1117]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FiTerminal className="w-3 h-3 text-emerald-400" />
              Execution Output
            </span>
            {execution.executed === false ? (
              <span className="text-[10px] text-slate-500">{execution.reason}</span>
            ) : (
              <span className="text-[10px] text-emerald-400">exit {execution.exitCode}</span>
            )}
          </div>
          {execution.executed ? (
            <pre className="px-3 pb-3 text-xs font-mono text-emerald-200/90 max-h-48 overflow-auto custom-scrollbar">
              {execution.stdout || "(no output)"}
              {execution.stderr ? `\n\n[stderr]\n${execution.stderr}` : ""}
            </pre>
          ) : (
            <p className="px-3 pb-3 text-[11px] text-slate-500 leading-relaxed">
              {execution.reason || "Server-side execution is not available."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}