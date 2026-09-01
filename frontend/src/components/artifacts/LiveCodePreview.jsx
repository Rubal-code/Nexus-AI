import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FiCopy,
  FiCheck,
  FiDownload,
  FiRefreshCw,
  FiMaximize,
  FiMinimize,
  FiFile,
  FiCode,
} from "react-icons/fi";
import {
  buildClientPreviewHtml,
  downloadBlob,
} from "../../features/chatApi";

const SANDBOX_POLICY = "allow-scripts allow-forms allow-downloads allow-modals";

/**
 * LiveCodePreview — "AI RESPONSE CODE | LIVE PREVIEW" split workspace.
 *
 * Security: the preview iframe is cross-origin (artifact URL served by the
 * gateway) and locked down with `sandbox="allow-scripts ..."` WITHOUT
 * `allow-same-origin` or `allow-top-navigation`, so generated code gets an
 * opaque origin and cannot touch the parent DOM, cookies, storage, auth
 * tokens or internal Nexus APIs. When the user edits code, the preview is
 * rendered via srcdoc inside the same locked iframe.
 */
export default function LiveCodePreview({ artifact, files, language }) {
  const initialFiles = useMemo(() => {
    if (files && files.length) {
      return files.map((f, i) => ({
        id: i,
        language: f.language || "text",
        filename: f.filename || `file-${i + 1}.txt`,
        content: f.content || "",
        edited: false,
      }));
    }
    return [];
  }, [files]);

  const [fileState, setFileState] = useState(initialFiles);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef(null);

  // React to artifact changes (new message/regeneration).
  useEffect(() => {
    setFileState(initialFiles);
    setActiveIdx(0);
    setDirty(false);
    setFullscreen(false);
  }, [initialFiles]);

  // Debounced "update preview when code changes".
  const handleChange = useCallback((idx, nextContent) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFileState((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, content: nextContent, edited: true } : f))
      );
    }, 420);
  }, []);

  const active = fileState[activeIdx] || fileState[0];

  const previewHtml = useMemo(() => {
    if (!fileState.length) return null;
    try {
      return buildClientPreviewHtml({
        language: language || "web",
        files: fileState.map((f) => ({ language: f.language, content: f.content })),
      });
    } catch (e) {
      return `<!doctype html><html><body style="color:#fecaca;background:#1f1a1a;font:12px monospace;padding:12px">Preview build error: ${String(
        e.message || e
      ).replace(/</g, "&lt;")}</body></html>`;
    }
  }, [fileState, language]);

  // Use the server-built artifact URL when nothing was edited.
  const useSrc = artifact?.url && !dirty;

  const handleCopy = async () => {
    const text = active?.content || "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!fileState.length) return;
    const isWeb =
      language === "web" ||
      language === "react" ||
      fileState.some((f) => ["html", "css", "javascript", "js", "jsx", "react"].includes(f.language));
    const blob = new Blob([isWeb ? previewHtml || "" : fileState.map((f) => f.content).join("\n\n")], {
      type: isWeb ? "text/html" : "text/plain",
    });
    downloadBlob({
      blob,
      filename: artifact?.name?.endsWith(".html")
        ? artifact.name
        : isWeb
          ? "nexus-preview.html"
          : `nexus-code-${Date.now()}.txt`,
    });
  };
if (fileState.length === 0) {
    // No structured files available — fall back to the stored HTML if present.
    return (
      <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15]">
        <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06] text-xs text-slate-300">
          <span className="flex items-center gap-2">
            <FiCode className="w-3.5 h-3.5 text-cyan-400" />
            Live Preview
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] hover:bg-white/[0.08] cursor-pointer"
              title="Refresh preview"
            >
              <FiRefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] hover:bg-white/[0.08] cursor-pointer"
              title="Download rendered HTML"
            >
              <FiDownload className="w-3 h-3" />
            </button>
          </div>
        </div>
        <iframe
          key={refreshKey}
          title="Nexus AI Live Preview"
          src={artifact?.url || undefined}
          sandbox={SANDBOX_POLICY}
          referrerPolicy="no-referrer"
          className="w-full h-[440px] border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div
      className={`my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg ${
        fullscreen ? "fixed inset-4 z-50 dark:bg-[#0c0e15] flex flex-col" : "w-full"
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-300 overflow-x-auto custom-scrollbar">
          <span className="p-1 rounded-md bg-cyan-500/15 text-cyan-400 shrink-0">
            <FiCode className="w-3.5 h-3.5" />
          </span>
          <span className="hidden sm:inline font-medium shrink-0">Code</span>
          {fileState.length > 1 && (
            <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar">
              {fileState.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                    i === activeIdx
                      ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/30"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  <FiFile className="w-2.5 h-2.5" />
                  {f.filename}
                </button>
              ))}
            </div>
          )}
          {dirty && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              ● modified
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy active file"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            {copied ? <FiCheck className="w-3 h-3 text-emerald-400" /> : <FiCopy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            onClick={handleDownload}
            title="Download code"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <FiDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen preview"}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            {fullscreen ? <FiMinimize className="w-3 h-3" /> : <FiMaximize className="w-3 h-3" />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </div>
{/* Split body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full lg:h-[460px]">
        {/* LEFT — code editor */}
        <div className="flex flex-col min-h-[240px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0a0d14]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1220] border-b border-white/[0.05]">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              {active?.language || "text"}
            </span>
            <button
              onClick={() => {
                setRefreshKey((k) => k + 1);
                setDirty(true);
              }}
              title="Refresh preview"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              <FiRefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          {active && (
            <textarea
              key={active.id}
              value={active.content}
              onChange={(e) => handleChange(activeIdx, e.target.value)}
              spellCheck={false}
              className="w-full h-[260px] lg:h-[424px] resize-none bg-transparent text-slate-200 text-xs font-mono leading-relaxed p-3 focus:outline-none custom-scrollbar"
              wrap="off"
            />
          )}
        </div>

        {/* RIGHT — sandboxed live preview */}
        <div className="flex flex-col bg-[#f8fafc]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live Preview
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {language === "react" ? "React" : "HTML/CSS/JS"} · sandboxed
            </span>
          </div>
          <iframe
            key={`${useSrc ? "src" : "doc"}-${refreshKey}-${dirty ? 1 : 0}`}
            title="Nexus AI Live Preview"
            src={useSrc ? artifact.url : undefined}
            srcDoc={useSrc ? undefined : previewHtml || undefined}
            sandbox={SANDBOX_POLICY}
            referrerPolicy="no-referrer"
            className="w-full h-[320px] lg:h-[424px] border-0 bg-white"
          />
          <div className="px-3 py-1.5 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex items-center gap-2">
            <FiCode className="w-3 h-3 text-slate-400 shrink-0" />
            Isolated sandbox — generated code cannot access this app, cookies, storage or tokens.
          </div>
        </div>
      </div>
    </div>
  );
}