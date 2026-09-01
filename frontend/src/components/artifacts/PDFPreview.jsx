import React from "react";
import { FiDownload, FiExternalLink, FiFileText } from "react-icons/fi";
import { downloadUrl, openArtifact } from "../../features/chatApi";

/**
 * PDFPreview — inline PDF iframe preview with Open / Download actions.
 */
export default function PDFPreview({ artifact }) {
  const url = artifact.url;
  const name = artifact.name || "document.pdf";
  const title = artifact.metadata?.title;
  const pageCount = artifact.metadata?.pageCount;

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="p-1 rounded-md bg-amber-500/15 text-amber-400 shrink-0">
            <FiFileText className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">{title || name}</p>
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              <span>{pageCount || "?"} page{pageCount === 1 ? "" : "s"}</span>
              <span>·</span>
              <span className="truncate">{name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openArtifact(url)}
            title="Open PDF in new tab"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <FiExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open PDF</span>
          </button>
          <button
            onClick={() => downloadUrl({ url, filename: name })}
            title="Download PDF"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <FiDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Inline PDF preview (browser-native viewer) */}
      {url ? (
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          title={name}
          className="w-full h-[480px] border-0 bg-white/5"
          loading="lazy"
        />
      ) : (
        <div className="py-10 text-center text-xs text-slate-400">No preview available.</div>
      )}
    </div>
  );
}