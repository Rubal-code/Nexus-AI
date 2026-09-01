import api from "../../utils/axios";

export const fetchConversations = async () => {
  const { data } = await api.get("/api/chat/get-conversations");
  return data;
};

export const createNewConversation = async () => {
  const { data } = await api.get("/api/chat/create-conversation");
  return data;
};

export const fetchMessages = async (conversationId) => {
  const { data } = await api.get(`/api/chat/get-messages/${conversationId}`);
  return data;
};

export const saveChatMessage = async ({ conversationId, role, content, targetAgent, artifact }) => {
  const { data } = await api.post("/api/chat/save-message", {
    conversationId,
    role,
    content,
    targetAgent,
    artifact,
  });
  return data;
};

export const updateConversationName = async ({ id, title }) => {
  const { data } = await api.post("/api/chat/update-conversation", {
    id,
    title,
  });
  return data;
};

export const deleteConversationById = async (id) => {
  const { data } = await api.delete(`/api/chat/delete-conversation/${id}`);
  return data;
};

export const sendAgentChat = async ({ prompt, conversationId }) => {
  const { data } = await api.post("/api/agent/chat", {
    prompt,
    conversationId,
  });
  return data;
};

/** Map a server artifact URL (http://localhost:8000/...) to a usable client URL. */
export const normalizeArtifactUrl = (url) => url || null;

/**
 * Build a self-contained HTML preview document client-side from artifact
 * code files (same algorithm as the backend codePreview.js).
 * Returns the HTML string usable in an iframe srcdoc.
 */
export function buildClientPreviewHtml({ language, files }) {
  const byLang = (list, langs) => (files || []).filter((f) => langs.includes(f.language));
  const htmlBlock = byLang(files, ["html", "htm", "xml"]).map((f) => f.content).join("\n");
  const css = byLang(files, ["css"]).map((f) => f.content).join("\n");
  const scripts = byLang(files, ["javascript", "js", "jsx", "react", "typescript", "ts", "tsx"]);
  const isReact =
    language === "react" ||
    scripts.some((b) => b.language === "jsx" || b.language === "react" || /createRoot|React\.|ReactDOM/.test(b.content));

  let marked = `#preview-error { position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999; background: #7f1d1d; color: #fecaca; font: 12px/1.5 ui-monospace, monospace; padding: 8px 12px; white-space: pre-wrap; }`;
  let head = "";
  let body = `<div id="root"></div>`;
  let scriptsHtml = "";

  if (htmlBlock && /<html|<!doctype/i.test(htmlBlock)) {
    let base = htmlBlock;
    if (css) base = /<\/head>/i.test(base) ? base.replace(/<\/head>/i, `<style>${css}</style></head>`) : base + `<style>${css}</style>`;
    if (!/<body/i.test(base)) base += `<body></body>`;
    return base.replace(/<\/body>/i, `<div id="preview-error"></div></body>`);
  }
  if (htmlBlock) body = htmlBlock;

  if (isReact) {
    head += `<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
  }

  scripts.forEach((b) => {
    const type = isReact && ["jsx", "react"].includes(b.language) ? ' type="text/babel"' : "";
    scriptsHtml += `\n<script${type}>\ntry {\n${b.content}\n} catch (e) { document.getElementById('preview-error').textContent = 'Script error: ' + e.message; }\n</script>`;
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Nexus AI Live Preview</title>
<style>${marked}
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
</style>
${head}
${css ? `<style>\n${css}\n</style>` : ""}
</head>
<body>
${body}
<div id="preview-error"></div>
${scriptsHtml}
</body>
</html>`;
}

/** Trigger a browser download for a text/blob artifact. */
export function downloadBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Trigger a browser download for a remote artifact URL. */
export function downloadUrl({ url, filename }) {
  if (url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** Open an artifact URL in a new tab. */
export function openArtifact(url) {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
