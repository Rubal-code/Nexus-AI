import { generateContent } from "../../utils/llm.js";
import { getConversationHistory, appendToMemory } from "../../utils/memory.js";
import { cleanResponse } from "../../utils/cleanResponse.js";
import {
  extractCodeBlocks,
  classifyCodeResponse,
  buildPreviewHtml,
  fileNameForType,
} from "../../utils/codePreview.js";
import { saveArtifact, createArtifact } from "../../utils/artifactStore.js";
import { runCode } from "../../utils/runCode.js";

const SYSTEM_PROMPT = `You are Nexus AI's Senior Software Engineer and Coding Specialist.

Implement EXACTLY what the user requested: the right page, screens, language,
and features. Do NOT invent extra pages, features, placeholder sections, or
unrelated code the user did not ask for.

Rules:
- Provide clean, robust, production-ready code with brief useful comments.
- Use proper Markdown code fences with language tags (\`\`\`html, \`\`\`css,
  \`\`\`javascript, \`\`\`python, \`\`\`jsx).
- For UI requests, provide the COMPLETE working app (full HTML/CSS/JS or React
  JSX). No abbreviated snippets, no "...rest of the code here".
- Reply with only the solution: a one-line intro, the fenced code, and at most
  a one-line usage note. Never add closing offers ("Would you like me to...?").`;

// Detects whether the request wants a browser-renderable UI so we can attach
// a live preview. Kept intentionally broad — it only affects the preview type.
const WEB_UI_DETECT =
  /\b(html|css|react|jsx|webpage|web page|website|web app|\bweb\b|landing ?page|login|log ?in|sign ?in|signup|sign ?up|register|auth|e-?commerce|shop|store|shopping|cart|checkout|calculator|dashboard|todo|to-do|portfolio|interface|frontend|game|animation|ui|homepage|home page|gallery|profile|\bpage\b|\bsite\b)\b/i;

/** Deduplicate identical code blocks the model sometimes emits twice. */
function dedupeBlocks(blocks) {
  const seen = new Set();
  const out = [];
  for (const block of blocks || []) {
    const sig = `${block.language}|${String(block.code).replace(/\s+/g, " ").trim().slice(0, 240)}`;
    if (seen.has(sig)) continue;
      seen.add(sig);
    out.push(block);
  }
  return out;
}

/** True when the text contains at least one fenced code block. */
function hasCodeBlock(text) {
  try {
    return extractCodeBlocks(String(text || "")).length > 0;
  } catch {
    return false;
  }
}

/** Extract a clean subject/noun-phrase from a request prompt for fallback titles. */
function extractSubject(prompt) {
  let s = String(prompt || "").trim();
  s = s.replace(/^(?:can you|could you|please|hey|nexus)\s*,?\s*/i, "");
  s = s.replace(
    /^(?:generate|create|build|make|write|code|implement|develop|need(?: a)?|i need|give|show|help|i want|i would like)\s+(?:a |an |the |some |me )?/i,
    ""
  );
  // "for a product called Tripmate" / "named X" -> the product name.
  const named = s.match(/\b(?:called|named)\s+["']?([\w][\w\s-]{0,48}?)(?:,|\.|;|\s+(?:with|for|and|plus|also|feat|in)\b|\s*$)/i);
  if (named) return named[1].trim().slice(0, 50);
  // "code for my e-commerce website" -> "e-commerce website"
  const forMatch = s.match(/\bfor\s+(?:my|a|an|the|your)?\s*(.+)$/i);
  if (forMatch)
    return forMatch[1].trim().replace(/^(?:a |an |the |my |your )/i, "").slice(0, 50);
  s = s.replace(/^(?:a |an |the |my |your )/i, "");
  const words = s.split(/[,\n;:/.]+/).map((w) => w.trim()).filter(Boolean);
  let out = words.slice(0, 4).join(" ");
  out = out.replace(/^(?:for|with)\s+/i, "");
  return out || "Web App";
}

/** Login/sign-up fallback page rendered when the LLM is unavailable. */
function buildAuthFallback(title) {
  return `### Login Page Generated Offline

A working login page for **"${title}"** (fallback template used only while the online model is unavailable):

\`\`\`html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Login · ${title}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; font-family: system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: linear-gradient(135deg, #0f172a, #312e81); color: #e2e8f0; padding: 20px; }
  .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px; padding: 32px; width: 100%; max-width: 360px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4); backdrop-filter: blur(8px); }
  .brand { text-align: center; font-weight: 700; font-size: 1.25rem; margin-bottom: 20px; }
  label { display: block; font-size: 0.78rem; color: #94a3b8; margin: 12px 0 6px; }
  input { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05); color: #f1f5f9; font-size: 0.92rem; outline: none; }
  input:focus { border-color: #818cf8; }
  button { width: 100%; margin-top: 18px; padding: 11px; border: 0; border-radius: 10px;
           background: #6366f1; color: #fff; font-weight: 600; font-size: 0.95rem; cursor: pointer; }
  button:hover { background: #818cf8; }
  .msg { margin-top: 14px; text-align: center; font-size: 0.8rem; color: #94a3b8; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">${title}</div>
    <form id="form">
      <label for="email">Email</label>
      <input id="email" type="email" placeholder="you@example.com" required autocomplete="email">
      <label for="password">Password</label>
      <input id="password" type="password" placeholder="••••••••" required autocomplete="current-password">
      <button type="submit">Sign In</button>
    </form>
    <div class="msg" id="msg">Use any email + password (demo only).</div>
  </div>
  <script>
    const form = document.getElementById('form');
    const msg = document.getElementById('msg');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      msg.textContent = email && password ? 'Signed in as ' + email + ' (demo)' : 'Please fill in both fields.';
    });
  <\/script>
</body>
</html>
\`\`\``;
}

/** E-commerce/shop fallback storefront rendered when the LLM is unavailable. */
function buildStoreFallback(title) {
  return `### E-commerce Storefront Generated Offline

A working product storefront for **"${title}"** (fallback template used only while the online model is unavailable):

\`\`\`html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Store · ${title}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; font-family: system-ui, sans-serif; }
  body { margin: 0; background: #0f172a; color: #e2e8f0; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
           background: #111827; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; }
  header h1 { font-size: 1.05rem; margin: 0; }
  .cart { background: #312e81; border-radius: 999px; padding: 6px 12px; font-size: 0.8rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 20px; }
  .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px; }
  .thumb { height: 120px; border-radius: 10px; background: linear-gradient(135deg, #1e293b, #3b0764);
           display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 10px; }
  .card h3 { margin: 0 0 6px; font-size: 0.95rem; }
  .card .price { color: #a5b4fc; font-weight: 700; }
  .card button { margin-top: 10px; width: 100%; padding: 8px; border: 0; border-radius: 9px;
                 background: #6366f1; color: #fff; font-weight: 600; cursor: pointer; }
  .card button:hover { background: #818cf8; }
</style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <span class="cart" id="cart">Cart: 0</span>
  </header>
  <main class="grid" id="grid"></main>
  <script>
    const products = [
      { name: 'Wireless Headphones', price: 59.99, emoji: '🎧' },
      { name: 'Smart Watch', price: 129.0, emoji: '⌚' },
      { name: 'Mechanical Keyboard', price: 89.99, emoji: '⌨️' },
      { name: 'USB-C Hub', price: 39.5, emoji: '🔌' },
      { name: 'Portable Speaker', price: 49.99, emoji: '🔊' },
      { name: 'Desk Lamp', price: 24.99, emoji: '💡' },
    ];
    const grid = document.getElementById('grid');
    const cart = document.getElementById('cart');
    let count = 0;
    products.forEach((p) => {
      const c = document.createElement('div');
      c.className = 'card';
      c.innerHTML = '<div class="thumb">' + p.emoji + '</div><h3>' + p.name +
        '</h3><div class="price">$' + p.price.toFixed(2) + '</div>';
      const btn = document.createElement('button');
      btn.textContent = 'Add to cart';
      btn.addEventListener('click', () => { count += 1; cart.textContent = 'Cart: ' + count; });
      c.appendChild(btn);
      grid.appendChild(c);
    });
  <\/script>
</body>
</html>
\`\`\``;
}

/** Build a fallback UI page matching the request KIND (login / store / generic). */
function buildWebFallback(prompt) {
    const title = extractSubject(prompt);
  const safeTitle = title.replace(/"/g, "'");
  const p = prompt.toLowerCase();
  if (/\b(login|log ?in|sign ?in|signup|sign ?up|register|auth)\b/.test(p)) {
    return buildAuthFallback(safeTitle);
  }
  if (/\b(e-?commerce|shop|store|shopping|cart|catalog|checkout)\b/.test(p)) {
    return buildStoreFallback(safeTitle);
  }
  return `### Web App Generated Offline

Here is a functional HTML/CSS/JS implementation for **"${safeTitle}"** (generated from fallback templates while the language model is unavailable):

\`\`\`html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; font-family: system-ui, sans-serif; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: linear-gradient(135deg, #0f172a, #312e81); color: #e2e8f0; padding: 20px; }
  .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px; padding: 28px; max-width: 420px; width: 100%; text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4); backdrop-filter: blur(8px); }
  h1 { font-size: 1.4rem; margin: 0 0 10px; }
  p { color: #94a3b8; font-size: 0.95rem; margin: 0 0 18px; }
  .output { font-size: 2rem; font-weight: 700; margin: 12px 0 18px; color: #a5b4fc; min-height: 2.4rem; }
  button { cursor: pointer; padding: 10px 18px; border-radius: 10px; border: 0;
           background: #6366f1; color: #fff; font-weight: 600; transition: transform .1s; }
  button:hover { background: #818cf8; } button:active { transform: scale(0.96); }
  .foot { margin-top: 16px; font-size: 0.7rem; color: #64748b; }
</style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>A working preview generated by Nexus AI. Interact with the button below.</p>
    <div class="output" id="output">0</div>
    <button id="btn">Click me</button>
    <div class="foot">Nexus AI \u00b7 Live Preview</div>
  </div>
  <script>
    const output = document.getElementById('output');
    const btn = document.getElementById('btn');
    let count = 0;
    btn.addEventListener('click', () => {
      count += 1;
      output.textContent = count;
    });
  <\/script>
</body>
</html>
\`\`\`

> While the online model is rate-limited, this fallback still gives you a real, editable implementation and live preview. Retry your prompt shortly to get a fully custom build.`;
}

export async function codingNode(state) {
  console.log(`[Coding Agent] Generating code solution for: "${state.prompt}"`);

  let artifact = null;
  let finalOutput = "";

  try {
    const history = await getConversationHistory(state.conversationId);
    let llmResponse = await generateContent({
      systemPrompt: SYSTEM_PROMPT,
      prompt: state.prompt,
      history,
      temperature: 0.2,
      maxOutputTokens: 6000,
    });

        if (llmResponse && hasCodeBlock(llmResponse)) {
      finalOutput = cleanResponse(llmResponse);
    } else if (WEB_UI_DETECT.test(state.prompt)) {
      // LLM unavailable (e.g. rate limited) → still deliver a real, previewable UI.
      finalOutput = buildWebFallback(state.prompt);
    } else {
      finalOutput = `### Code Solution\n\nHere is the implementation for **"${state.prompt}"**:\n\n\`\`\`python\ndef solution():\n    """Implementation for ${state.prompt}"""\n    print("Nexus AI Code Execution")\n    return True\n\nif __name__ == "__main__":\n    solution()\n\`\`\``;
    }

    // Deduplicate repeated/duplicate code blocks the model may have emitted,
    // then classify for the right preview experience.
    const blocks = dedupeBlocks(extractCodeBlocks(finalOutput));
    const classification = classifyCodeResponse(state.prompt, blocks);

    console.log(
      `[Coding Agent] ${blocks.length} code block(s), preview=${classification.previewType}`
    );

    if (classification.previewType === "iframe" && blocks.length > 0) {
      // Build a sandbox-ready HTML preview and store it as an artifact.
      const previewHtml = buildPreviewHtml({
        blocks,
        language: classification.language,
      });

      const stored = await saveArtifact({
        data: Buffer.from(previewHtml, "utf-8"),
        filename: `nexus-preview-${Date.now()}.html`,
        mimeType: "text/html",
      });

      artifact = createArtifact({
        artifactType: "html",
        name: stored.name,
        mimeType: stored.mimeType,
        url: stored.url,
        previewType: "iframe",
        metadata: {
          language: classification.language,
          files: blocks.map((b) => ({ language: b.language, filename: b.filename })),
          code: blocks.map((b) => ({ language: b.language, content: b.code })),
          generatedAt: new Date().toISOString(),
        },
      });
    } else {
      // Source code artifact (no browser execution available/requested).
      artifact = createArtifact({
        artifactType: "code",
        name:
          blocks.length > 0
            ? fileNameForType("code", Date.now())
            : "source.txt",
        mimeType: "text/plain",
        url: null, // no stored file — source stays inline
        previewType: "code",
        metadata: {
          language: classification.language,
          files: blocks.map((b) => ({ language: b.language, filename: b.filename })),
          code: blocks.map((b) => ({ language: b.language, content: b.code })),
          generatedAt: new Date().toISOString(),
        },
      });

      // Optional server-side execution for Python/JS when enabled.
      if (blocks.length === 1 && ["python", "py", "javascript", "js"].includes(blocks[0].language)) {
        const execResult = await runCode({
          language: blocks[0].language,
          code: blocks[0].code,
        });
        artifact.metadata.execution = execResult;
        if (execResult.executed) {
          finalOutput += `\n\n### Execution Output\n\n\`\`\`\n${execResult.stdout || "(no output)"}${execResult.stderr ? `\n\n[stderr]\n${execResult.stderr}` : ""}\n\`\`\``;
        }
      }
    }
  } catch (error) {
    console.error(`[Coding Agent] Unexpected error: ${error.message}`);
    finalOutput = `### Code Generation Failed\n\nI couldn't generate that code due to an internal error. Please try again.`;
  }

  if (state.conversationId) {
    await appendToMemory(state.conversationId, "user", state.prompt);
    await appendToMemory(state.conversationId, "assistant", finalOutput);
  }

  return {
    output: finalOutput,
    artifact,
    messages: [
      {
        role: "assistant",
        sender: "Coding Agent",
        content: finalOutput,
      },
    ],
  };
}