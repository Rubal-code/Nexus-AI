import Groq from "groq-sdk";

let groqInstance = null;

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

// Verified-working OpenRouter FREE models (checked against the live model
// catalog). OpenRouter is used automatically whenever Groq is rate-limited,
// over quota, or its small TPM budget rejects a large coding request.
const OPENROUTER_FREE_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "minimax/minimax-m3:free",
  "nvidia/nemotron-3.5-lightning:free",
  "cohere/north-mini-code:free",
  "dots-studio/dots-3-note-preview:free",
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Keep conversation context small enough to fit Groq's tight TPM budget
// (8000) so large coding prompts don't fail with a 413 request-too-large.
const HISTORY_MAX_MESSAGES = 6;
const HISTORY_MAX_CHARS = 900;
// Groq's 8K TPM ceiling is tight. Cap its completion budget so a large
// coding prompt (6000 tokens) + history never trips a 413; the full budget is
// still used on OpenRouter (no such ceiling).
const GROQ_MAX_OUTPUT_TOKENS = 4000;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return null;
  }
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

function getOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return apiKey && apiKey.startsWith("sk-or-") ? apiKey : null;
}

/** Shrink conversation history so requests stay well under token budgets. */
function trimHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-HISTORY_MAX_MESSAGES).map((item) => {
    const role = item.role === "assistant" ? "assistant" : "user";
    let content = String(item.content || "");
    if (content.length > HISTORY_MAX_CHARS) {
      content = `${content.slice(0, HISTORY_MAX_CHARS)}\n…[truncated]`;
    }
    return { role, content };
  });
}

/** Try every OpenRouter free model in order; returns text or null. */
async function completeWithOpenRouter({ messages, temperature, maxOutputTokens }) {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    console.warn("[LLM] No valid OPENROUTER_API_KEY provided.");
    return null;
  }

  for (const model of OPENROUTER_FREE_MODELS) {
    try {
        const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let res;
      try {
        res = await fetch(OPENROUTER_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Nexus AI",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxOutputTokens,
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

            const body = await res.json().catch(() => ({}));
      // OpenRouter sometimes returns HTTP 200 with an embedded `error` object
      // (e.g. an upstream 502 / provider overload) and NO content. Treat that as
      // a real failure so the loop advances to the next free model instead of
      // silently surfacing an empty/stub answer.
      if (!res.ok || body?.error) {
        throw new Error(
          `OpenRouter ${res.status} ${body?.error?.message || res.statusText}`
        );
      }

      const text = body?.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[LLM] Generated response using OpenRouter model [${model}]`);
        return text;
      }
      throw new Error("OpenRouter returned empty content");
    } catch (error) {
      console.warn(
        `[LLM] OpenRouter model "${model}" error: ${error.message}. Trying next...`
      );
    }
  }

  return null;
}

/**
 * Generate AI content.
 * Primary: Groq (fast, free). Fallback: OpenRouter free models — this covers
 * Groq rate limits / 413 token-limit rejections for large coding prompts.
 */
export async function generateContent({
  systemPrompt,
  prompt,
  history = [],
  temperature = 0.7,
  maxOutputTokens = 2048,
  provider = "auto",
}) {
  // Build message array for chat completion
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  for (const item of trimHistory(history)) {
    messages.push(item);
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  // 1) Groq candidates first (low latency), unless the caller explicitly
  //    requests OpenRouter (codingNode does, to avoid Groq's 8K TPM ceiling
  //    that 413s on large/structured code prompts).
      const useGroq = provider !== "openrouter";
  const groq = useGroq ? getGroqClient() : null;
  if (groq) {
    let lastError = null;
    for (const modelName of GROQ_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model: modelName,
          messages,
                    temperature,
          max_tokens: Math.min(maxOutputTokens, GROQ_MAX_OUTPUT_TOKENS),
        });

        const text = response.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[LLM] Generated response using model [${modelName}]`);
          return text;
        }
      } catch (error) {
        lastError = error.message;
        console.warn(`[LLM] Groq model "${modelName}" error: ${error.message}.`);
      }
    }
    console.warn(
      `[LLM] Groq unavailable (${lastError}); switching to OpenRouter free models.`
    );
  } else {
    console.warn("[LLM] No valid GROQ_API_KEY provided.");
  }

  // 2) OpenRouter free-model fallback.
  const openRouterText = await completeWithOpenRouter({
    messages,
    temperature,
    maxOutputTokens,
  });
  if (openRouterText) return openRouterText;

  console.error("[LLM] All providers (Groq + OpenRouter) failed.");
  return null;
}
