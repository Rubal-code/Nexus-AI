import Groq from "groq-sdk";

let groqInstance = null;

const SUPPORTED_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

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

/**
 * Generate AI content using Groq API with multi-model fallback
 */
export async function generateContent({
  systemPrompt,
  prompt,
  history = [],
  temperature = 0.7,
  maxOutputTokens = 2048,
}) {
  const groq = getGroqClient();
  if (!groq) {
    console.warn("[LLM] No valid GROQ_API_KEY provided.");
    return null;
  }

  // Build message array for chat completion
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  if (history && history.length > 0) {
    for (const item of history) {
      messages.push({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content,
      });
    }
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  // Try candidate models in order of priority
  for (const modelName of SUPPORTED_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model: modelName,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
      });

      const text = response.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[LLM] Generated response using model [${modelName}]`);
        return text;
      }
    } catch (error) {
      console.warn(`[LLM] Model "${modelName}" error: ${error.message}. Trying fallback model...`);
    }
  }

  console.error("[LLM] All Groq candidate models failed.");
  return null;
}
