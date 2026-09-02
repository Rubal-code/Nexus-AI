/**
 * imageGen.js
 * Real image generation.
 *
 * Primary: Google Imagen models via the Generative Language API (REST) when a
 * GEMINI_API_KEY is configured.
 *
 * Fallback: Pollinations.ai (keyless) — used automatically when no Gemini key
 * is present or when every Imagen model fails, so the image agent always
 * returns a real image instead of an error. Images are streamed server-side
 * and stored in the artifact store, so the file URL stays local.
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

function aspectDimensions(ratio) {
  if (ratio === "16:9") return { width: 1280, height: 720 };
  if (ratio === "9:16") return { width: 720, height: 1280 };
  return { width: 1024, height: 1024 };
}

/** Unique per-call seed so regenerations produce visibly different frames. */
function seedFor(prompt) {
  const base = `${prompt.trim()}|${Date.now()}`;
  let h = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000000;
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
 * Keyless image generation via Pollinations.ai (flux model). Returns a Buffer.
 * https://image.pollinations.ai/prompt/... supports ?width, ?height, ?seed,
 * ?nologo=true and ?model=flux.
 */
async function callPollinations(prompt, aspectRatio, seed) {
  const { width, height } = aspectDimensions(aspectRatio);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux&enhance=true`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Pollinations API ${response.status}: ${response.statusText}`);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  if (!buf || buf.length < 100) {
    throw new Error("Pollinations returned an empty image body");
  }
  return buf;
}

/**
 * Generate a real image for the given prompt.
 */
export async function generateImage({ prompt, history = [], temperature = 0.8 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasImagenKey = !!(apiKey && apiKey !== "your_gemini_api_key_here");

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

  // 2. Try Imagen models first when a Gemini key is available.
  if (hasImagenKey) {
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
    console.warn(
      `[ImageGen] All Imagen models failed (${lastError?.message}); falling back to Pollinations.`
    );
  } else {
    console.log(
      "[ImageGen] No GEMINI_API_KEY configured; using keyless Pollinations.ai backend."
    );
  }

  // 3. Keyless fallback — a real image, no credentials required.
  try {
    const data = await callPollinations(optimizedPrompt, aspectRatio, seedFor(prompt));
    const modelLabel = hasImagenKey ? "pollinations-flux (fallback)" : "pollinations-flux";
    console.log(`[ImageGen] Success via ${modelLabel}`);
    return {
      ok: true,
      data,
      mimeType: "image/png",
      model: modelLabel,
      optimizedPrompt,
      aspectRatio,
    };
  } catch (error) {
    const msg = hasImagenKey
      ? `Image generation failed: Imagen unavailable and keyless fallback errored: ${error.message}`
      : `Image generation failed: ${error.message}. Configure GEMINI_API_KEY for Imagen, or check network access to image.pollinations.ai.`;
    return {
      ok: false,
      error: msg,
      optimizedPrompt,
      aspectRatio,
    };
  }
}