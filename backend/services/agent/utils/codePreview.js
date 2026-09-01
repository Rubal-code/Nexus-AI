/**
 * codePreview.js
 * Extracts code blocks from an agent response and builds a self-contained
 * HTML document that can run in a sandboxed iframe (for HTML/CSS/JS/React).
 */
import { sanitizeFilename } from "./artifactStore.js";

const WEB_LANGUAGES = new Set([
  "html", "htm", "xml", "css", "javascript", "js", "jsx", "react",
  "typescript", "ts", "tsx", "svg",
]);

/**
 * Extract fenced code blocks from a markdown response.
 * Returns [{ language, code, filename }].
 */
export function extractCodeBlocks(markdown) {
  const blocks = [];
  const regex = /```([\w+#.-]*)\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(String(markdown || ""))) !== null) {
    const language = (match[1] || "").split(" ")[0].toLowerCase() || "text";
    const code = match[2].replace(/\n$/, "");
    if (!code.trim()) continue;
    blocks.push({ language, code, filename: inferFilename(language, blocks.length + 1) });
  }
  return blocks;
}

function inferFilename(language, index) {
  const ext = {
    html: "html", css: "css", javascript: "js", js: "js", jsx: "jsx",
    react: "jsx", typescript: "ts", ts: "tsx", python: "py", py: "py",
    bash: "sh", json: "json", sql: "sql", svg: "svg", xml: "xml",
    text: "txt", markdown: "md",
  };
  return `file-${index}.${ext[language] || "txt"}`;
}

const REACT_HINT = /\b(react|jsx)\b/i;
const WEB_UI_HINT =
  /\b(html|css|react|jsx|frontend|webpage|web page|website|web app|landing ?page|calculator|dashboard|todo|portfolio|interface|spa|component|ui)\b/i;

/** Decide whether the produced code should get a live browser preview. */
export function classifyCodeResponse(prompt, blocks) {
  const languages = blocks.map((b) => b.language);
  const hasWebLanguage = languages.some((l) => WEB_LANGUAGES.has(l));
  const looksLikeReact =
    REACT_HINT.test(prompt) ||
    languages.includes("jsx") ||
    languages.includes("react");

  if (hasWebLanguage) {
    return { previewType: "iframe", language: looksLikeReact ? "react" : "web" };
  }
  if (WEB_UI_HINT.test(prompt) && languages.includes("javascript")) {
    return { previewType: "iframe", language: "web" };
  }
  return { previewType: "code", language: languages[0] || "text" };
}

/** Extract React component names from JS/JSX source. */
function detectComponentNames(code) {
  const names = new Set();
  const patterns = [
    /function\s+([A-Z]\w*)/g,
    /class\s+([A-Z]\w*)/g,
    /\bconst\s+([A-Z]\w*)\s*=\s*(?:function|class|\(|\w*=>)/g,
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(code)) !== null) names.add(m[1]);
  }
  return [...names];
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
/**
 * Build a self-contained HTML document from extracted code blocks.
 * - Merges CSS/JS into the document.
 * - Wraps React/JSX code with Babel + React UMD so it executes in the browser.
 */
export function buildPreviewHtml({ blocks, language = "web" }) {
  const htmlBlock = blocks.find((b) => ["html", "htm", "xml"].includes(b.language));
  const css = blocks
    .filter((b) => b.language === "css")
    .map((b) => b.code)
    .join("\n");
  const scriptBlocks = blocks.filter((b) =>
    ["javascript", "js", "jsx", "react", "typescript", "ts", "tsx"].includes(b.language)
  );

  const isReact =
    language === "react" ||
    scriptBlocks.some((b) => b.language === "jsx" || b.language === "react" || /createRoot|React\.|ReactDOM/.test(b.code));

  let bodyMarkup = "";
  let headInject = "";
  let tailScripts = "";

  // If a complete full HTML document was generated, use it as the base.
  if (htmlBlock && /<html|<!doctype/i.test(htmlBlock.code)) {
    let base = htmlBlock.code;
    if (css) {
      if (/<\/head>/i.test(base)) {
        base = base.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`);
      } else {
        base += `<style>\n${css}\n</style>`;
      }
    }
    return wrapWithErrorShell(base);
  }

  // React runtime (only when React/JSX code is present).
  if (isReact) {
    headInject += `
    <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
  }

  if (htmlBlock) {
    bodyMarkup = htmlBlock.code;
  } else {
    bodyMarkup = `<div id="root"></div>`;
  }

  scriptBlocks.forEach((block) => {
    const useBabel =
      isReact && ["jsx", "react", "tsx"].includes(block.language) ? ' type="text/babel"' : "";
    tailScripts += `\n<script${useBabel}>
try {\n${block.code}\n} catch (e) {
  document.getElementById('preview-error').textContent += "Script error: " + e.message;
}
</script>`;
  });
// Auto-mount React component if the user did not mount it themselves.
  if (isReact) {
    const candidates = detectComponentNames(
      scriptBlocks.map((b) => b.code).join("\n")
    )
      .map((n) => `window.${n}`)
      .join(", ");
    tailScripts += `
<script type="text/babel">
window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  if (!root || root.children.length > 0) return;
  const candidates = [${candidates}];
  const comp = candidates.find((c) => c && (typeof c === 'function' || typeof c === 'object'));
  if (comp) {
    try {
      ReactDOM.createRoot(root).render(React.createElement(comp));
    } catch (e) {
      document.getElementById('preview-error').textContent = "Mount error: " + e.message;
    }
  } else {
    document.getElementById('preview-error').textContent = "React component detected but none was mounted. Ensure your code calls ReactDOM.createRoot(document.getElementById('root')).render(<App />).";
  }
});
</script>`;
  }

  const fullDoc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Nexus AI Live Preview</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  #preview-error {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
    background: #7f1d1d; color: #fecaca; font: 12px/1.5 ui-monospace, monospace;
    padding: 8px 12px; white-space: pre-wrap;
  }
</style>
${headInject}
${css ? `<style>\n${css}\n</style>` : ""}
</head>
<body>
${bodyMarkup}
<div id="preview-error"></div>
${tailScripts}
</body>
</html>`;

  return fullDoc;
}

/** Wrap an already-complete HTML document with an error report surface. */
function wrapWithErrorShell(html) {
  const errorDiv = `<div id="preview-error" style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fecaca;font:12px/1.5 ui-monospace,monospace;padding:8px 12px;white-space:pre-wrap;"></div>`;
  if (/<body/i.test(html)) {
    return html.replace(/<\/body>/i, `${errorDiv}\n</body>`);
  }
  return html + errorDiv;
}

export function fileNameForType(artifactType, index) {
  const name =
    artifactType === "html"
      ? `nexus-preview-${index}.html`
      : artifactType === "pdf"
        ? `nexus-doc-${index}.pdf`
        : artifactType === "pptx"
          ? `nexus-deck-${index}.pptx`
          : artifactType === "image"
            ? `nexus-image-${index}.png`
            : `nexus-code-${index}.txt`;
  return sanitizeFilename(name);
}