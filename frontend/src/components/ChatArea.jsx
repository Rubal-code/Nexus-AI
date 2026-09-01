import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMobileSidebarOpen, toggleSidebar } from "../redux/chatSlice";
import MessageBubble from "./MessageBubble";
import EmptyChat from "./EmptyChat";
import ChatInput from "./ChatInput";
import { FiMenu, FiSidebar, FiShield, FiTrash2 } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

export default function ChatArea({ onSendMessage, onSelectPrompt, onStop }) {
  const dispatch = useDispatch();
  const {
    conversations,
    activeConversationId,
    messages,
    isLoadingMessages,
    isStreaming,
  } = useSelector((state) => state.chat);

  const messagesEndRef = useRef(null);

  const activeConversation = conversations.find(
    (c) => c._id === activeConversationId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0b0d13] text-white relative overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0f121a]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Mobile hamburger */}
          <button
            onClick={() => dispatch(setMobileSidebarOpen(true))}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          {/* Desktop expand button when collapsed */}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden md:flex p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Toggle Sidebar"
          >
            <FiSidebar className="w-4 h-4" />
          </button>

          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              {activeConversation?.title || "New Chat"}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Agent Router Active</span>
            </div>
          </div>
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <HiSparkles className="w-3.5 h-3.5" />
            <span>Nexus AI v2</span>
          </div>
        </div>
      </header>

      {/* Main Messages Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4">
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          <EmptyChat onSelectPrompt={onSelectPrompt} />
        ) : (
          <div className="py-2">
            {messages.map((msg, idx) => (
              <MessageBubble key={msg._id || idx} message={msg} />
            ))}

            {/* Thinking / Streaming Indicator */}
            {isStreaming && (
              <div className="flex gap-3.5 my-4 px-3 md:px-6 w-full max-w-4xl mx-auto items-center">
                <div className="w-8 h-8 rounded-xl bg-[#181d2a] border border-white/[0.08] text-indigo-400 flex items-center justify-center shrink-0">
                  <HiSparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
                <div className="flex items-center gap-2 bg-[#141824] border border-white/[0.07] px-4 py-3 rounded-2xl text-xs text-slate-300">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="text-slate-400 font-medium">Nexus AI is thinking & routing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <ChatInput
        onSend={onSendMessage}
        isStreaming={isStreaming}
        onStop={onStop}
      />
    </div>
  );
}
