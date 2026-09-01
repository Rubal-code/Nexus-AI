import React, { useState, useEffect } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiExternalLink,
  FiSliders,
} from "react-icons/fi";
import { downloadUrl, openArtifact } from "../../features/chatApi";

/**
 * SlidePreview — slide-by-slide viewer with Previous/Next controls,
 * plus Open / Download for the actual .pptx file.
 */
export default function SlidePreview({ artifact }) {
  const slides = artifact.metadata?.slides || [];
  const [index, setIndex] = useState(0);
  const total = Math.max(slides.length, 1);

  useEffect(() => {
    setIndex(0);
  }, [artifact.url]);

  const current = slides[index] || {};
  const bullets = Array.isArray(current.bullets) ? current.bullets : [];
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));

  const name = artifact.name || "presentation.pptx";
  const title = artifact.metadata?.title || name;

  return (
    <div className="w-full my-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0e15] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121622] border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="p-1 rounded-md bg-purple-500/15 text-purple-400 shrink-0">
            <FiSliders className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">{title}</p>
            <p className="text-[10px] text-slate-500">{total} slide{total === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openArtifact(artifact.url)}
            title="Open .pptx file"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-purple-300 hover:bg-purple-500/10 transition-colors cursor-pointer"
          >
            <FiExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            onClick={() => downloadUrl({ url: artifact.url, filename: name })}
            title="Download .pptx"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <FiDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Slide Canvas */}
      <div className="relative bg-gradient-to-br from-[#1a2030] to-[#10141f] p-4 sm:p-6">
        <div className="relative mx-auto max-w-3xl aspect-video rounded-lg overflow-hidden border border-white/[0.09] shadow-2xl flex flex-col bg-[#0f121a] text-white">
          {/* Slide number chip */}
          <div className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest text-slate-400 bg-black/30 border border-white/[0.06] rounded-full px-2 py-0.5">
            NEXUS AI {String(index + 1).padStart(2, "0")}
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-8 overflow-hidden">
            <h3 className="text-xl sm:text-3xl font-bold text-white mb-3 break-words">
              {current.title || "Untitled Slide"}
            </h3>
            <div className="w-12 h-1 rounded-full bg-indigo-500 mb-4" />
            <ul className="space-y-2.5">
              {(bullets.length ? bullets : ["—"]).map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm sm:text-base leading-relaxed text-slate-300"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span className="break-words">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {current.notes && (
            <div className="px-6 py-2 border-t border-white/[0.06] bg-black/20 text-[11px] text-slate-500 truncate">
              <span className="text-slate-400 font-medium">Notes: </span>
              {current.notes}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <span className="text-xs text-slate-400 tabular-nums">
            Slide {index + 1} of {total}
          </span>
          <button
            onClick={next}
            disabled={index >= total - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}