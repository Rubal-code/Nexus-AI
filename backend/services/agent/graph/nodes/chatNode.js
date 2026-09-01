import { generateContent } from "../../utils/llm.js";
import { getConversationHistory, appendToMemory } from "../../utils/memory.js";
import { cleanResponse } from "../../utils/cleanResponse.js";

const SYSTEM_PROMPT = `You are Nexus AI, a premier high-performance AI assistant.
Respond accurately, clearly, and insightfully.
Format responses using rich GitHub Markdown (bolding, lists, code blocks, tables).
Never include unnecessary AI throat-clearing like "Sure! Here is the answer:".`;

export async function chatNode(state) {
  console.log(`[Chat Agent] Processing response...`);

  let contextPrompt = state.prompt;
  if (state.searchResult) {
    contextPrompt = `User question: ${state.prompt}\n\nSearch Context:\n${state.searchResult}\n\nPlease synthesize an accurate answer incorporating facts from the search context with citations.`;
  }

  const history = await getConversationHistory(state.conversationId);
  const llmResponse = await generateContent({
    systemPrompt: SYSTEM_PROMPT,
    prompt: contextPrompt,
    history,
    temperature: 0.7,
  });

  let finalOutput = "";
  if (llmResponse) {
    finalOutput = cleanResponse(llmResponse);
  } else {
    // Fallback response
    if (state.searchResult) {
      finalOutput = `### Search & Synthesis\n\nBased on the latest search data:\n\n${state.searchResult}\n\n**Answer:** Here is the synthesized response for **"${state.prompt}"**.`;
    } else {
      finalOutput = `Hello! I am **Nexus AI**. I am ready to assist you with answering questions, coding, researching with web search, generating presentations, or creating PDF documents. How can I help you today?`;
    }
  }

  // Persist to conversation memory
  if (state.conversationId) {
    await appendToMemory(state.conversationId, "user", state.prompt);
    await appendToMemory(state.conversationId, "assistant", finalOutput);
  }

  return {
    output: finalOutput,
    messages: [
      {
        role: "assistant",
        sender: "Chat Agent",
        content: finalOutput,
      },
    ],
  };
}
