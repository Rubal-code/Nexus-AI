/**
 * imageGen.js
 * Real image generation using Google's Imagen models via the
 * Generative Language API (REST). The same GEMINI_API_KEY used for chat
 * powers image generation; no extra credentials are needed.
 *
 * Returns { ok: true, data, mimeType, model, optimizedPrompt, aspectRatio }
 *      or { ok: false, error, optimizedPrompt }.
 */
import { generateContent } from "./llm.js";

const IMAGEN_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
  "imagen-3.0-generate-001",
];

const PROMPT_OPTIMIZER = `You are Nexus AI's Image Prompt Engineer.
Rewrite the user's image request into a single, detailed, optimized
text-to-image prompt. Keep it under 450 characters. Include subject,
style, lighting, composition and mood. Output ONLY the prompt text.`;

function deriveAspectRatio(prompt) {
  const p = prompt.toLowerCase();
  if (/\b(poster|portrait|vertical|story|reel|instagram)\b/.test(p)) return "9:16";
  if (/\b(wide|landscape|banner|cinematic|panorama|desktop wallpaper)\b/.test(p)) return "16:9";
  return "1:1";
}

async function callImagen(apiKey, model, prompt, aspectRatio) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    }
  );

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err?.error?.message || JSON.stringify(err).slice(0, 300);
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Imagen API ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const raw =
    data?.predictions?.[0]?.bytesBase64Encoded ||
    data?.predictions?.[0]?.image?.bytesBase64Encoded ||
    data?.image?.bytesBase64Encoded;

  if (!raw) throw new Error("Imagen returned an empty prediction");
  return Buffer.from(raw, "base64");
}

/**
 * Generate a real image for the given prompt.
 */
export async function generateImage({ prompt, history = [], temperature = 0.8 }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return {
      ok: false,
      error:
        "Image generation requires a valid GEMINI_API_KEY configured for the Agent Service (Imagen models).",
      optimizedPrompt: prompt,
      aspectRatio: deriveAspectRatio(prompt),
    };
  }

  // 1. Optimize the user prompt through the LLM (kept as artifact metadata).
  let optimizedPrompt = prompt;
  try {
    const refined = await generateContent({
      systemPrompt: PROMPT_OPTIMIZER,
      prompt,
      history,
      temperature: 0.8,
      maxOutputTokens: 512,
    });
    if (refined && refined.trim()) optimizedPrompt = refined.trim();
  } catch (error) {
    console.warn("[ImageGen] Prompt optimization skipped:", error.message);
  }

  const aspectRatio = deriveAspectRatio(prompt);

  // 2. Try Imagen models in priority order.
  let lastError = null;
  for (const model of IMAGEN_MODELS) {
    try {
      const data = await callImagen(apiKey, model, optimizedPrompt, aspectRatio);
      console.log(`[ImageGen] Success via ${model}`);
      return {
        ok: true,
        data,
        mimeType: "image/png",
        model,
        optimizedPrompt,
        aspectRatio,
      };
    } catch (error) {
      lastError = error;
      console.warn(`[ImageGen] Model "${model}" failed: ${error.message}`);
    }
  }

  return {
    ok: false,
    error: `Image generation failed: ${lastError?.message || "unknown error"}`,
    optimizedPrompt,
    aspectRatio,
  };
}