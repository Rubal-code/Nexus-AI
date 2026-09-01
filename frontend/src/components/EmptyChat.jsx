import React from "react";
import {
  FiSearch,
  FiTerminal,
  FiFileText,
  FiSliders,
  FiImage,
  FiMessageSquare,
  FiArrowUpRight,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

const SUGGESTIONS = [
  {
    icon: FiSearch,
    title: "Real-time Search",
    prompt: "Search online for the latest breakthroughs in AI agents and LLMs.",
    tag: "Web Search",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
  },
  {
    icon: FiTerminal,
    title: "Senior Coding Assistant",
    prompt: "Write a high-performance LRU cache implementation in Python with unit tests.",
    tag: "Code Generation",
    color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
  },
  {
    icon: FiSliders,
    title: "Presentation Deck",
    prompt: "Generate a 5-slide pitch deck presentation outline for an AI startup.",
    tag: "Slide Architect",
    color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
  },
  {
    icon: FiFileText,
    title: "PDF Report Blueprint",
    prompt: "Create a formal project specification document for a microservices architecture.",
    tag: "Document Engine",
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
  },
];

export default function EmptyChat({ onSelectPrompt }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-8 max-w-3xl mx-auto text-center">
      {/* Nexus AI Orb Glow */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-1 ring-white/20">
          <HiSparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-lg opacity-30 -z-10 animate-tilt" />
      </div>

      {/* Hero Title */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
        What would you like to build with{" "}
        <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
          Nexus AI
        </span>
        ?
      </h1>
      <p className="text-sm text-slate-400 max-w-lg mb-8">
        Your unified agent system with autonomous routing for live web search, code generation, presentation decks, and document design.
      </p>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group relative flex flex-col p-4 rounded-2xl bg-[#121622] hover:bg-[#161c2d] border border-white/[0.07] hover:border-indigo-500/40 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border bg-gradient-to-br ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {item.title}
                  </span>
                </div>
                <FiArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
