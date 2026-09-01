import React, { useState, useRef, useEffect } from "react";
import {
  FiSend,
  FiSquare,
  FiSearch,
  FiTerminal,
  FiFileText,
  FiSliders,
  FiImage,
} from "react-icons/fi";

const QUICK_TAGS = [
  { label: "Search", prefix: "Search online for ", icon: FiSearch, color: "hover:border-emerald-500/50 hover:text-emerald-300" },
  { label: "Code", prefix: "Write code to ", icon: FiTerminal, color: "hover:border-cyan-500/50 hover:text-cyan-300" },
  { label: "PDF", prefix: "Generate a PDF document for ", icon: FiFileText, color: "hover:border-amber-500/50 hover:text-amber-300" },
  { label: "PPT", prefix: "Generate presentation slides for ", icon: FiSliders, color: "hover:border-purple-500/50 hover:text-purple-300" },
  { label: "Image", prefix: "Generate an image of ", icon: FiImage, color: "hover:border-pink-500/50 hover:text-pink-300" },
];

export default function ChatInput({ onSend, isStreaming, onStop }) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!prompt.trim() || isStreaming) return;
    onSend(prompt.trim());
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTagClick = (prefix) => {
    setPrompt((prev) => {
      if (prev.startsWith(prefix)) return prev;
      return prefix + prev;
    });
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 md:px-6 pb-4 pt-1">
      {/* Quick Agent Mode Chips */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
        <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">
          Agents:
        </span>
        {QUICK_TAGS.map((tag, idx) => {
          const Icon = tag.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTagClick(tag.prefix)}
              disabled={isStreaming}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141824] border border-white/[0.06] text-slate-300 text-[11px] transition-all cursor-pointer ${tag.color}`}
            >
              <Icon className="w-3 h-3" />
              <span>{tag.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Form Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 bg-[#121622] border border-white/[0.1] focus-within:border-indigo-500/60 rounded-2xl p-2.5 shadow-xl shadow-black/40 transition-all duration-150"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nexus AI anything, search the web, generate code or documents..."
          disabled={isStreaming}
          className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm px-2 py-1.5 resize-none focus:outline-none max-h-[200px] custom-scrollbar"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shrink-0"
            title="Stop generating"
          >
            <FiSquare className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim() || isStreaming}
            className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 cursor-pointer ${
              prompt.trim() && !isStreaming
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30"
                : "bg-white/[0.04] text-slate-400 cursor-not-allowed border border-white/[0.05]"
            }`}
            title="Send prompt (Enter)"
          >
            <FiSend className="w-4 h-4" />
          </button>
        )}
      </form>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-2">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-slate-400 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-slate-400 font-mono text-[10px]">Shift + Enter</kbd> for new line</span>
        <span>Nexus AI Agent Suite v2.0</span>
      </div>
    </div>
  );
}
