import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FiCopy, FiCheck, FiDownload, FiRefreshCw,
  FiMaximize, FiMinimize, FiX,
} from "react-icons/fi";
import { buildClientPreviewHtml, downloadBlob } from "../../features/chatApi";

const SANDBOX_POLICY = "allow-scripts allow-forms allow-downloads allow-modals";

/**
 * LiveCodePreview — split CODE | LIVE PREVIEW workspace with fullscreen.
 *
 * The preview iframe is sandboxed WITHOUT allow-same-origin or
 * allow-top-navigation so generated code gets an opaque origin and cannot
 * touch parent DOM, cookies, storage, or auth tokens. Preview content is
 * delivered via srcDoc (client-built, blob-origin) so it renders reliably
 * even when the gateway artifact URL is cross-origin — this was the root
 * cause of the black screen in fullscreen mode.
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
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const iframeRef = useRef(null);

  // Close fullscreen on Escape + prevent body scroll behind overlay.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "overflow-hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  // React to artifact changes (new message/regeneration).
  useEffect(() => {
    setFileState(initialFiles);
    setActiveIdx(0);
    setDirty(false);
    setFullscreen(false);
    setRefreshKey(0);
    setError("");
  }, [initialFiles]);

  // Debounced "update preview when code changes".
  const handleChange = useCallback((idx, nextContent) => {
    setError("");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFileState((prev) =>
        prev.map((f, i) =>
          i === idx ? { ...f, content: nextContent, edited: true } : f
        )
      );
      setDirty(true);
    }, 420);
  }, []);

  const active = fileState[activeIdx] || fileState[0];

  // Build a self-contained preview document client-side from the code files.
  // PRIMARY source — avoids cross-origin src issues that caused the black screen.
  const previewHtml = useMemo(() => {
    if (!fileState.length) return null;
    try {
      return buildClientPreviewHtml({
        language: language || "web",
        files: fileState.map((f) => ({
          language: f.language,
          content: f.content,
        })),
      });
    } catch (e) {
      setError(String((e && e.message) || e || "Preview build error"));
      const msg = String((e && e.message) || e || "").replace(/</g, "&lt;");
      return `<!doctype html><html><body style="color:#fecaca;background:#1f1a1a;font:12px monospace;padding:12px">Preview build error: ${msg}</body></html>`;
    }
  }, [fileState, language, refreshKey]);

  // ALWAYS prefer srcDoc (client-built) for reliability. Server artifact URL
  // is only a fallback when there are zero code files.
  const useSrc = Boolean(artifact?.url && !fileState.length && !dirty);

  const handleCopy = async () => {
    const text = active?.content || "";
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text;
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!fileState.length) return;
    const combined = fileState.map((f) => `<!-- ${f.filename} -->\n${f.content}`).join("\n\n");
    downloadBlob({ blob: new Blob([combined], { type: "text/plain" }), filename: "nexus-code-preview.txt" });
  };

  const reloadFrame = () => {
    setRefreshKey((k) => k + 1); setDirty(true);
    if (iframeRef.current) {
      try { iframeRef.current.srcdoc = previewHtml || ""; iframeRef.current.contentWindow?.location.reload(); } catch {}
    }
  };

  const renderIframe = (sizeClass) => (
    <iframe
      ref={iframeRef}
      key={`preview-${useSrc ? "src" : "doc"}-${refreshKey}-${dirty ? 1 : 0}`}
      title="Nexus AI Live Preview"
      src={useSrc ? artifact.url : undefined}
      srcDoc={useSrc ? undefined : previewHtml || undefined}
      sandbox={SANDBOX_POLICY}
      referrerPolicy="no-referrer"
      allowFullScreen
      className={sizeClass}
    />
  );

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg data-reveal">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="p-1 rounded-md bg-cyan-500/15 text-cyan-400 shrink-0"><FiMaximize className="w-3.5 h-3.5" /></span>
          <span className="font-medium truncate">AI RESPONSE CODE</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} title="Copy code" className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
            {copied ? <FiCheck className="w-3 h-3 text-emerald-400" /> : <FiCopy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button onClick={handleDownload} title="Download code" disabled={fileState.length === 0} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
            <FiDownload className="w-3 h-3" /><span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={reloadFrame} title="Refresh preview" className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
            <FiRefreshCw className="w-3 h-3" /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit fullscreen" : "Fullscreen preview"} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
            {fullscreen ? <FiMinimize className="w-3 h-3" /> : <FiMaximize className="w-3 h-3" />}
            <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      {/* Inline — only rendered when not fullscreen */}
      {!fullscreen && (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* LEFT — code editor */}
          <div className="flex flex-col min-h-[240px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0a0d14]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1220] border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{active?.language || "text"}</span>
              <button onClick={reloadFrame} title="Refresh" className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer">
                <FiRefreshCw className="w-3 h-3" /><span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
            {active && (
              <textarea
                key={active.id} value={active.content}
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
                <span className="w-2 h-2 rounded-full bg-emerald-500" />Live Preview
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {language === "react" ? "React" : "HTML/CSS/JS"} · sandboxed
              </span>
            </div>
            {renderIframe("w-full h-[320px] lg:h-[424px] border-0")}
            <div className="px-3 py-1.5 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex items-center gap-2">
              <FiMaximize className="w-3 h-3 text-slate-400 shrink-0" />
              Isolated sandbox — generated code cannot access cookies, storage or tokens.
            </div>
          </div>
        </div>
      )}

      {error && <div className="px-3 py-2 border-t border-rose-500/30 bg-rose-900/20 text-[11px] text-rose-300">{error}</div>}
      {/* ==================== FULLSCREEN OVERLAY ==================== */}
      {fullscreen && (
        <div
          data-reveal
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b0d13]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl m-4 shadow-2xl shadow-black/60"
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#12162a] border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="p-1 rounded-md bg-cyan-500/15 text-cyan-400"><FiMaximize className="w-3.5 h-3.5" /></span>
              <span className="font-medium truncate">{active?.filename || "Live Preview"}</span>
              <span className="text-[10px] text-slate-500">
                {language === "react" ? "React" : "HTML/CSS/JS"} · sandboxed
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleDownload} title="Download" className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.10] transition-colors cursor-pointer"><FiDownload className="w-3 h-3" /></button>
              <button onClick={reloadFrame} title="Refresh" className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.10] transition-colors cursor-pointer"><FiRefreshCw className="w-3 h-3" /></button>
              <button onClick={() => setFullscreen(false)} title="Exit fullscreen (Esc)" className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.10] transition-colors cursor-pointer"><FiX className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0 border-t border-white/[0.06]">
            {renderIframe("w-full h-full border-0")}
          </div>
        </div>
      )}
    </div>
  );
}
