import redis from "../config/redis.js";

const MEMORY_KEY_PREFIX = "conv-memory:";
const MAX_MESSAGES = 20;

// Local in-memory fallback cache if Redis is offline
const localMemoryStore = new Map();

/**
 * Retrieve conversation history from Redis (or local in-memory fallback).
 * Returns an array of { role, content } objects.
 */
export const getConversationHistory = async (conversationId) => {
  try {
    if (!conversationId) return [];

    const key = `${MEMORY_KEY_PREFIX}${conversationId}`;

    if (redis && redis.status === "ready") {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    }

    return localMemoryStore.get(key) || [];
  } catch (error) {
    return localMemoryStore.get(`${MEMORY_KEY_PREFIX}${conversationId}`) || [];
  }
};

/**
 * Append a message to conversation memory and trim to MAX_MESSAGES.
 */
export const appendToMemory = async (conversationId, role, content) => {
  try {
    if (!conversationId) return;

    const key = `${MEMORY_KEY_PREFIX}${conversationId}`;
    const existing = await getConversationHistory(conversationId);

    existing.push({ role, content });
    const trimmed = existing.slice(-MAX_MESSAGES);

    localMemoryStore.set(key, trimmed);

    if (redis && redis.status === "ready") {
      await redis.set(key, JSON.stringify(trimmed), "EX", 60 * 60 * 24);
    }
  } catch (error) {
    // silently fail
  }
};

/**
 * Clear all memory for a conversation.
 */
export const clearMemory = async (conversationId) => {
  try {
    if (!conversationId) return;
    const key = `${MEMORY_KEY_PREFIX}${conversationId}`;
    localMemoryStore.delete(key);
    if (redis && redis.status === "ready") {
      await redis.del(key);
    }
  } catch (error) {
    // silently fail
  }
};
