import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  searchFilter: "",
  isLoadingConversations: false,
  isLoadingMessages: false,
  isStreaming: false,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload || [];
    },
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload);
      state.activeConversationId = action.payload._id;
      state.messages = [];
    },
    updateConversationTitle: (state, action) => {
      const { id, title } = action.payload;
      const conv = state.conversations.find((c) => c._id === id);
      if (conv) conv.title = title;
    },
    removeConversation: (state, action) => {
      const id = action.payload;
      state.conversations = state.conversations.filter((c) => c._id !== id);
      if (state.activeConversationId === id) {
        state.activeConversationId = state.conversations[0]?._id || null;
        state.messages = [];
      }
    },
    setActiveConversationId: (state, action) => {
      state.activeConversationId = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload || [];
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateLastMessage: (state, action) => {
      if (state.messages.length > 0) {
        const lastIndex = state.messages.length - 1;
        state.messages[lastIndex] = {
          ...state.messages[lastIndex],
          ...action.payload,
        };
      }
    },
    setSearchFilter: (state, action) => {
      state.searchFilter = action.payload;
    },
    setIsLoadingConversations: (state, action) => {
      state.isLoadingConversations = action.payload;
    },
    setIsLoadingMessages: (state, action) => {
      state.isLoadingMessages = action.payload;
    },
    setIsStreaming: (state, action) => {
      state.isStreaming = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileSidebarOpen: (state, action) => {
      state.mobileSidebarOpen = action.payload;
    },
    resetChatState: () => initialState,
  },
});

export const {
  setConversations,
  addConversation,
  updateConversationTitle,
  removeConversation,
  setActiveConversationId,
  setMessages,
  addMessage,
  updateLastMessage,
  setSearchFilter,
  setIsLoadingConversations,
  setIsLoadingMessages,
  setIsStreaming,
  toggleSidebar,
  setMobileSidebarOpen,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
