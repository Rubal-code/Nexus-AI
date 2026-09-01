/**
 * structuredLlm.js
 * Helpers for requesting and parsing structured JSON output from the LLM.
 */
import { generateContent } from "./llm.js";

/**
 * Ask the LLM for a JSON object. Returns the parsed object or null.
 */
export async function generateStructuredJson({
  systemPrompt,
  prompt,
  history = [],
  temperature = 0.4,
  maxOutputTokens = 2048,
}) {
  const raw = await generateContent({
    systemPrompt: `${systemPrompt}\n\nReturn ONLY a valid JSON object. No markdown fences, no commentary.`,
    prompt,
    history,
    temperature,
    maxOutputTokens,
  });
  if (!raw) return null;
  return extractJson(raw);
}

/**
 * Extract a JSON object from arbitrary model text (strips markdown fences,
 * finds the outermost { ... } region).
 */
export function extractJson(text) {
  if (!text || typeof text !== "string") return null;

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}