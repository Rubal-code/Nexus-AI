/**
 * Router Agent Node
 * Analyzes the input prompt and determines the appropriate destination agent.
 *
 * Priority order intentionally puts explicitly-requested artifacts
 * (image / pdf / ppt / code-with-preview) ahead of generic chat so that
 * requests like "generate an image of a dog" never fall through to plain
 * text generation.
 */
export async function routerNode(state) {
  const rawPrompt = state.prompt || "";
  const prompt = rawPrompt.toLowerCase();

  let targetAgent = "chat"; // Default fallback

  const hasImageIntent =
    /\b(image|picture|photo|draw|illustration|generate .*image|create .*image|make .*image|artwork|logo|wallpaper)\b/.test(prompt);

  const hasPdfIntent =
    /\b(pdf|make .*pdf|create .*pdf|generate .*pdf|report as pdf|pdf (report|document|file))\b/.test(prompt);

  const hasPptIntent =
    /\b(ppt|pptx|powerpoint|slides|slide deck|presentation|make .*deck|create (a )?(slide|presentation|deck))\b/.test(prompt);

  const hasCodeIntent =
    /\b(code|script|function|program|algorithm|implement|develop|build|create|make|write)\b/.test(prompt) ||
    /\b(python|javascript|typescript|react|html|css|java|c\+\+|golang|rust|sql)\b/.test(prompt);

  const hasWebUiIntent =
    /\b(html|css|react|jsx|webpage|web page|website|web app|landing ?page|page|calculator|dashboard|todo|portfolio|interface|frontend|game|animation)\b/.test(prompt);

  const hasSearchIntent =
    /\b(search|lookup|find online|google|latest news|what('s| is) (new|happening)|trending|research online)\b/.test(prompt);

  // 1. Explicit artifact requests take priority.
  if (hasImageIntent) {
    targetAgent = "imageGen";
  } else if (hasPdfIntent) {
    targetAgent = "pdf";
  } else if (hasPptIntent) {
    targetAgent = "ppt";
  } else if (hasCodeIntent && hasWebUiIntent) {
    // e.g. "build a calculator in HTML" → coding + live preview
    targetAgent = "coding";
  } else if (hasCodeIntent) {
    // e.g. "write Python code" → coding (source code panel)
    targetAgent = "coding";
  } else if (hasSearchIntent) {
    targetAgent = "search";
  }

  console.log(`[Router Agent] Routed prompt "${state.prompt}" to agent -> [${targetAgent}]`);

  return {
    targetAgent,
    messages: [
      {
        role: "system",
        content: `Router Agent decided to route task to: ${targetAgent}`,
      },
    ],
  };
}

/**
 * Conditional routing logic for graph edge decision.
 */
export function routeDecision(state) {
  return state.targetAgent || "chat";
}
