import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setConversations,
  addConversation,
  setActiveConversationId,
  setMessages,
  addMessage,
  setIsLoadingConversations,
  setIsLoadingMessages,
  setIsStreaming,
  updateConversationTitle,
} from "../redux/chatSlice";
import {
  fetchConversations,
  createNewConversation,
  fetchMessages,
  saveChatMessage,
  sendAgentChat,
  updateConversationName,
} from "../features/chatApi";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";

export default function ChatPage() {
  const dispatch = useDispatch();
  const { conversations, activeConversationId, isStreaming } = useSelector(
    (state) => state.chat
  );

  const activeConvIdRef = useRef(activeConversationId);
  activeConvIdRef.current = activeConversationId;

  // Initial load: Fetch conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        dispatch(setIsLoadingConversations(true));
        const data = await fetchConversations();
        dispatch(setConversations(data));

        if (data && data.length > 0) {
          if (!activeConvIdRef.current) {
            dispatch(setActiveConversationId(data[0]._id));
          }
        } else {
          // If no conversations exist, create the initial new chat
          const newConv = await createNewConversation();
          dispatch(setConversations([newConv]));
          dispatch(setActiveConversationId(newConv._id));
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        dispatch(setIsLoadingConversations(false));
      }
    };

    loadConversations();
  }, [dispatch]);

  // When active conversation changes, load messages
  useEffect(() => {
    if (!activeConversationId) return;

    const loadMessages = async () => {
      try {
        dispatch(setIsLoadingMessages(true));
        const data = await fetchMessages(activeConversationId);
        dispatch(setMessages(data));
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        dispatch(setIsLoadingMessages(false));
      }
    };

    loadMessages();
  }, [activeConversationId, dispatch]);

  // Handle sending message
  const handleSendMessage = async (prompt) => {
    if (!prompt.trim() || isStreaming) return;

    let targetConvId = activeConversationId;

    // If no active conversation, create one on the fly
    if (!targetConvId) {
      try {
        const newConv = await createNewConversation();
        dispatch(addConversation(newConv));
        targetConvId = newConv._id;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    const currentConv = conversations.find((c) => c._id === targetConvId);
    const isFirstMessage = !currentConv || currentConv.title === "New Chat";

    // 1. Optimistic User Message
    const userMsg = {
      conversationId: targetConvId,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    dispatch(addMessage(userMsg));

    // Save user message to database
    saveChatMessage(userMsg).catch((err) =>
      console.warn("Could not persist user message:", err.message)
    );

    // If first message in conversation, auto-generate and update title
    if (isFirstMessage) {
      const generatedTitle = prompt.slice(0, 32) + (prompt.length > 32 ? "..." : "");
      updateConversationName({ id: targetConvId, title: generatedTitle }).catch(
        () => {}
      );
      dispatch(
        updateConversationTitle({ id: targetConvId, title: generatedTitle })
      );
    }

    // 2. Call Agent Service
    dispatch(setIsStreaming(true));

    try {
      const response = await sendAgentChat({
        prompt,
        conversationId: targetConvId,
      });

      const assistantMsg = {
        conversationId: targetConvId,
        role: "assistant",
        content: response.output || "I have processed your request.",
        targetAgent: response.targetAgent,
        artifact: response.artifact || null,
        createdAt: new Date().toISOString(),
      };

      dispatch(addMessage(assistantMsg));

      // Save assistant message to database
      saveChatMessage(assistantMsg).catch((err) =>
        console.warn("Could not persist assistant message:", err.message)
      );
    } catch (error) {
      console.error("Agent chat error:", error);
      const errorMsg = {
        conversationId: targetConvId,
        role: "assistant",
        content: `Error: Unable to complete request (${error.response?.data?.message || error.message}). Please check backend agent services.`,
        createdAt: new Date().toISOString(),
      };
      dispatch(addMessage(errorMsg));
    } finally {
      dispatch(setIsStreaming(false));
    }
  };

  const handleStop = () => {
    dispatch(setIsStreaming(false));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0d13]">
      <Sidebar />
      <ChatArea
        onSendMessage={handleSendMessage}
        onSelectPrompt={handleSendMessage}
        onStop={handleStop}
      />
    </div>
  );
}
