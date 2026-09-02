/**
 * structuredLlm.js
 * Helpers for requesting and parsing structured JSON output from the LLM.
 */
import { generateContent } from "./llm.js";

/**
 * Ask the LLM for a JSON value. Returns the parsed object/array or null.
 */
export async function generateStructuredJson({
  systemPrompt,
  prompt,
  history = [],
  temperature = 0.4,
  maxOutputTokens = 2048,
}) {
  const raw = await generateContent({
    systemPrompt: `${systemPrompt}\n\nReturn ONLY a single valid JSON value (object or array). No markdown fences, no commentary.`,
    prompt,
    history,
    temperature,
    maxOutputTokens,
  });
  if (!raw) return null;
  return extractJson(raw);
}

/**
 * Extract a JSON value (object OR array) from arbitrary model text.
 * Handles markdown fences, leading/trailing commentary, top-level arrays
 * and objects. Returns the parsed value or null.
 */
export function extractJson(text) {
  if (!text || typeof text !== "string") return null;

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;

  // 1) The whole string may already be clean JSON.
  try {
    return JSON.parse(candidate.trim());
  } catch {
    /* fall through */
  }

  // 2) Outermost object { ... } (e.g. model added commentary around it).
  const objStart = candidate.indexOf("{");
  const objEnd = candidate.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(candidate.slice(objStart, objEnd + 1));
    } catch {
      /* fall through */
    }
  }

  // 3) Outermost array [ ... ] (e.g. a slide deck returned as a JSON array).
  const arrStart = candidate.indexOf("[");
  const arrEnd = candidate.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(candidate.slice(arrStart, arrEnd + 1));
    } catch {
      /* fall through */
    }
  }

  return null;
}