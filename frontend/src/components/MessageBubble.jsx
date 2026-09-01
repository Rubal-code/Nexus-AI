import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiCopy,
  FiCheck,
  FiUser,
  FiTerminal,
  FiSearch,
  FiFileText,
  FiSliders,
  FiImage,
  FiMessageSquare,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import ArtifactRenderer from "./artifacts/ArtifactRenderer";

function getAgentMeta(targetAgent, content) {
  if (targetAgent === "search" || content.includes("Search Results") || content.includes("Search context")) {
    return {
      name: "Search Agent",
      icon: FiSearch,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    };
  }
  if (targetAgent === "coding" || content.includes("```python") || content.includes("```javascript")) {
    return {
      name: "Coding Agent",
      icon: FiTerminal,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    };
  }
  if (targetAgent === "pdf" || content.includes("PDF Engine") || content.includes("Document Specification")) {
    return {
      name: "PDF Agent",
      icon: FiFileText,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    };
  }
  if (targetAgent === "ppt" || content.includes("Slide 1:") || content.includes("Presentation Deck")) {
    return {
      name: "PPT Agent",
      icon: FiSliders,
      color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };
  }
  if (targetAgent === "imageGen" || content.includes("Visual Description:") || content.includes("Optimized Prompt")) {
    return {
      name: "ImageGen Agent",
      icon: FiImage,
      color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    };
  }
  return {
    name: "Chat Agent",
    icon: FiMessageSquare,
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  };
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentMeta = !isUser ? getAgentMeta(message.targetAgent, message.content || "") : null;
  const AgentIcon = agentMeta?.icon || HiSparkles;

  return (
    <div
      className={`flex gap-3.5 my-4 px-3 md:px-6 w-full max-w-4xl mx-auto ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white"
            : "bg-[#181d2a] border border-white/[0.08] text-indigo-400"
        }`}
      >
        {isUser ? <FiUser className="w-4 h-4" /> : <HiSparkles className="w-4 h-4 text-indigo-400" />}
      </div>

      {/* Message Box */}
      <div
        className={`flex flex-col max-w-[85%] md:max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Agent Metadata Badge */}
        {!isUser && agentMeta && (
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${agentMeta.color}`}
            >
              <AgentIcon className="w-3 h-3" />
              {agentMeta.name}
            </span>
            <span className="text-[11px] text-slate-400">Nexus AI</span>
          </div>
        )}

        {/* Message Content Bubble */}
        <div
          className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-600/15 rounded-tr-xs"
              : "bg-[#141824] border border-white/[0.07] text-slate-100 shadow-md rounded-tl-xs"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-headings:text-slate-100 prose-headings:font-semibold prose-a:text-indigo-400 prose-a:underline hover:prose-a:text-indigo-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");

                      if (!inline && match) {
                        return (
                          <div className="my-3 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0c0e15]">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-[#121622] border-b border-white/[0.06] text-xs text-slate-400 font-mono">
                              <span>{match[1]}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(codeString)}
                                className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer"
                              >
                                <FiCopy className="w-3 h-3" />
                                Copy
                              </button>
                            </div>
                            <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-200">
                              <code>{children}</code>
                            </pre>
                          </div>
                        );
                      }
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-white/[0.08] text-indigo-300 text-xs font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Rich artifact result (image / pdf / pptx / code+preview) */}
              {message.artifact && <ArtifactRenderer artifact={message.artifact} />}
            </>
          )}

          {/* Action Toolbar */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.05] text-xs text-slate-400">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <FiCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-3 h-3" />
                    <span>Copy response</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
