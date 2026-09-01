import React from "react";
import { FiDownload, FiExternalLink, FiRefreshCw, FiImage } from "react-icons/fi";
import { downloadUrl, openArtifact } from "../../features/chatApi";

/**
 * ImagePreview — displays a generated image with Regenerate / Open / Download.
 */
export default function ImagePreview({ artifact, onRegenerate }) {
  const [failed, setFailed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const url = artifact.url;
  const name = artifact.name || "image.png";
  const optimizedPrompt = artifact.metadata?.optimizedPrompt;

  const handleOpen = () => openArtifact(url);
  const handleDownload = () => downloadUrl({ url, filename: name });
  const handleRegenerate = () => onRegenerate && onRegenerate(artifact);

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="p-1 rounded-md bg-pink-500/15 text-pink-400 shrink-0">
            <FiImage className="w-3.5 h-3.5" />
          </span>
          <span className="font-medium truncate">{name}</span>
          {artifact.metadata?.model && (
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
              {artifact.metadata.model}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              title="Regenerate image"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-pink-300 hover:bg-pink-500/10 border border-transparent hover:border-pink-500/30 transition-colors cursor-pointer"
            >
              <FiRefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}
          <button
            onClick={handleOpen}
            title="Open image in new tab"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <FiExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            onClick={handleDownload}
            title="Download image"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
          >
            <FiDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Image Body */}
      <div className="flex items-center justify-center bg-grid p-3">
        {loading && !failed && (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <div className="w-6 h-6 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
            <span className="text-[11px]">Loading image…</span>
          </div>
        )}
        {!failed ? (
          <img
            src={url}
            alt={name}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
            className="max-w-full max-h-[420px] rounded-lg border border-white/[0.06] object-contain shadow-md"
          />
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-rose-300 font-medium">Image failed to load</p>
            <p className="text-[11px] text-slate-400 mt-1 break-all">The URL may have expired or the file was removed.</p>
          </div>
        )}
      </div>

      {/* Optional metadata: the optimized prompt used to render the image */}
      {optimizedPrompt && (
        <div className="px-3 py-2 border-t border-white/[0.05] bg-[#0e1220]">
          <div className="flex items-start gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 shrink-0">Prompt</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">{optimizedPrompt}</p>
          </div>
        </div>
      )}
    </div>
  );
}