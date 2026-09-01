import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setActiveConversationId,
  addConversation,
  removeConversation,
  updateConversationTitle,
  setSearchFilter,
  toggleSidebar,
  setMobileSidebarOpen,
} from "../redux/chatSlice";
import { clearUserData } from "../redux/userSlice";
import {
  createNewConversation,
  deleteConversationById,
  updateConversationName,
} from "../features/chatApi";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import api from "../../utils/axios";
import {
  FiPlus,
  FiMessageSquare,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiLogOut,
  FiSidebar,
  FiZap,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

export default function Sidebar() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const {
    conversations,
    activeConversationId,
    searchFilter,
    sidebarCollapsed,
    mobileSidebarOpen,
    isStreaming,
  } = useSelector((state) => state.chat);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredConversations = conversations.filter((conv) =>
    (conv.title || "New Chat").toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleNewChat = async () => {
    if (isStreaming) return;
    try {
      const newConv = await createNewConversation();
      dispatch(addConversation(newConv));
      dispatch(setMobileSidebarOpen(false));
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversationById(id);
      dispatch(removeConversation(id));
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleStartEdit = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title || "New Chat");
  };

  const handleSaveEdit = async (e, id) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await updateConversationName({ id, title: editTitle.trim() });
      dispatch(updateConversationTitle({ id, title: editTitle.trim() }));
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleLogout = async () => {
    try {
      await api.get("/api/auth/logout");
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch(clearUserData());
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={() => dispatch(setMobileSidebarOpen(false))}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#0f121a] border-r border-white/[0.07] transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[72px]" : "w-72"
        } ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <HiSparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Nexus AI
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Intelligent Agent Suite
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => dispatch(toggleSidebar())}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <FiSidebar className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            disabled={isStreaming}
            title="Start a new chat"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium shadow-md shadow-indigo-600/25 border border-indigo-400/20 transition-all duration-200 cursor-pointer ${
              sidebarCollapsed ? "justify-center px-0" : ""
            } ${isStreaming ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FiPlus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Search Filter */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center">
              <FiSearch className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchFilter}
                onChange={(e) => dispatch(setSearchFilter(e.target.value))}
                className="w-full bg-[#161a26] text-xs text-slate-200 placeholder-slate-400 rounded-lg pl-8 pr-3 py-2 border border-white/[0.06] focus:border-indigo-500/60 focus:outline-none transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => dispatch(setSearchFilter(""))}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          {!sidebarCollapsed && (
            <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Conversations
            </div>
          )}

          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              {!sidebarCollapsed && (
                <span>
                  {searchFilter ? "No matches found" : "No conversations yet"}
                </span>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConversationId === conv._id;
              const isEditing = editingId === conv._id;

              return (
                <div
                  key={conv._id}
                  onClick={() => {
                    if (!isEditing) {
                      dispatch(setActiveConversationId(conv._id));
                      dispatch(setMobileSidebarOpen(false));
                    }
                  }}
                  className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent"
                  } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                >
                  <FiMessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />

                  {!sidebarCollapsed && (
                    <>
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(e, conv._id);
                              if (e.key === "Escape") handleCancelEdit(e);
                            }}
                            autoFocus
                            className="bg-black/50 text-xs text-white px-2 py-0.5 rounded border border-indigo-500 outline-none w-full"
                          />
                          <button
                            onClick={(e) => handleSaveEdit(e, conv._id)}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <FiCheck className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-slate-400 hover:text-slate-200"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate flex-1">
                          {conv.title || "New Chat"}
                        </span>
                      )}

                      {!isEditing && (
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleStartEdit(e, conv)}
                            title="Rename"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                          >
                            <FiEdit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, conv._id)}
                            title="Delete"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/10"
                          >
                            <FiTrash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* User / Settings Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-[#0c0e15]">
          {userData && (
            <div
              className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] ${
                sidebarCollapsed ? "justify-center p-1" : ""
              }`}
            >
              {userData.avatar ? (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-8 h-8 rounded-full border border-indigo-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                  {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              {!sidebarCollapsed && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {userData.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {userData.email}
                  </span>
                </div>
              )}

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
