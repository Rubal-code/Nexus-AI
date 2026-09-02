/**
 * Router Agent Node
 * Analyzes the input prompt and determines the appropriate destination agent.
 *
 * Matching is *intent-first*: a request is classified by the combination of an
 * imperative verb + an artifact noun (e.g. "generate" + "slides"), never by a
 * bare topic noun. This fixes classic false positives:
 *
 *   - "Create a PRESENTATION about IMAGE processing"  -> ppt (not imageGen)
 *   - "Write a REPORT about PICTURE quality"          -> pdf (not imageGen)
 *   - "Write a poem / essay / email..."               -> chat (not coding)
 *
 * A topic-qualifier guard (about / on / for / covering / regarding) blocks
 * image routing when the word "image/picture" is merely the topic of a slide
 * deck or report, and creative-writing nouns are excluded from code/doc flows.
 */

// ---- Image intent --------------------------------------------------------
const IMAGE_NOUNS =
  /\b(?:image|picture|photo|photograph|portrait|illustration|wallpaper|logo|artwork|banner|thumbnail|avatar|icon|drawing|sketch|gif|meme|poster|painting|character design|concept art)\b/i;
// Verbs whose object is very likely a picture when an image noun is present.
const IMAGE_VERBS =
  /\b(?:generate|create|make|design|produce|animate|illustrate|imagine|envision|show|generate an|create an|make an|produce an)\b/i;
// Verbs that mean "make a picture" on their own.
const DRAW_VERBS =
  /\b(?:draw|drawn|sketch|sketch out|paint|illustrate|render)\b/i;
// Noun-led phrasing: "a picture of a dog", "logo for my startup".
const IMAGE_NOUN_LEAD =
  /^(?:an? |the )?(?:image|picture|photo|photograph|portrait|illustration|logo|wallpaper|sketch|drawing)\b[\s\S]{0,12}?\b(?:of|for)\b/i;
// A deck/report whose *topic* contains an image word must NOT become imageGen:
// "presentation about image processing" -> ppt, "report on picture quality" -> pdf.
const ARTIFACT_LEAD_WITH_TOPIC =
  /(?:presentation|slides?|slide deck|ppt|pptx|powerpoint|deck|report|document|doc|pdf|white ?paper|essay)\b[\s\S]{0,55}?\b(?:about|on|regarding|concerning|covering|for)\b/i;

// ---- PDF / document intent ----------------------------------------------
const DOC_NOUNS =
  /\b(?:pdf|report|whitepaper|white paper|document|doc|blueprint|specification|spec|proposal|memo|memorandum|summary|handbook|manual|guide|briefing|brief|resume|cv|case study|release notes|task sheet|invoice)\b/i;
const CREATE_VERBS =
  /\b(?:create|make|generate|build|design|prepare|develop|produce|draft|write|compose|author|compile|assemble|put together|prep)\b/i;

// ---- PPT intent ----------------------------------------------------------
const PPT_NOUNS =
  /\b(?:presentation|slides|slide deck|slideware|ppt|pptx|powerpoint|keynote|google slides|deck)\b/i;
const PPT_LEAD =
  /^(?:an? |the )?(?:presentation|slide deck|powerpoint|ppt|slides)\b/i;

// ---- Coding intent -------------------------------------------------------
const LANGUAGES =
  /\b(?:python|javascript|typescript|jsx|tsx|react|html|css|sql|golang|go\b|java|c\+\+|c#|\bc\b|ruby|php|swift|kotlin|rust|bash|shell|powershell|json|xml|yaml|sass|scss|dart|elixir|haskell|\br\b|matlab|julia|vue|angular|svelte|nextjs|django|flask|express|node|terraform|docker|graphql)\b/i;
const CODE_NOUNS =
  /\b(?:code|script|snippet|program|app|application|website|web ?page|web ?app|frontend|dashboard|calculator|todo|to-do list|portfolio|form|bot|api|endpoint|route|server|component|module|class|function|algorithm|regex|query|automation|microservice|extension|cli|library|pipeline|game|animation|landing page|ui|interface|spa|hook|test case|lru cache|sort|crud)\b/i;
const CODE_VERBS =
  /\b(?:write|code|build|implement|develop|generate|fix|debug|refactor|optimize|convert|translate|migrate|script|automate|test|define|deploy|configure|integrate)\b/i;
const WEB_UI_NOUNS =
  /\b(?:html|css|react|jsx|webpage|web page|website|web app|landing ?page|calculator|dashboard|todo|to-do|portfolio|interface|frontend|spa|component|game|animation|ui|form)\b/i;

// ---- Search intent -------------------------------------------------------
const SEARCH_INTENT =
  /\b(?:search|lookup|look up|find online|google|fetch|latest news|breaking news|whats happening|what's happening|current (?:news|events)|trending|research online|summarize the news|live scores|weather (?:in|for)|stock price|who won|score of)\b/i;

// ---- Creative / literary output that must stay in chat --------------------
const CREATIVE_NOUNS =
  /\b(?:poem|poetry|essay|story|narrative|novel|article|blog|blog post|newsletter|speech|lyrics|song|screenplay|joke|caption|social media post|social post|content|paragraph|email|letter|message|sms|copy|tweet|headline|slogan|tagline|bio)\b/i;

/** Normalize a prompt for matching: lowercase + collapse whitespace. */
function normalizePrompt(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
export async function routerNode(state) {
  const rawPrompt = state.prompt || "";
  const prompt = normalizePrompt(rawPrompt);

  let targetAgent = "chat"; // Default fallback

  const hasCreative = CREATIVE_NOUNS.test(prompt);
  const hasSearchIntent = SEARCH_INTENT.test(prompt) && !hasCreative;

  // ---- Image intent (guarded against topic collisions with decks/reports) ----
  const hasImageIntent =
    !hasCreative &&
    !ARTIFACT_LEAD_WITH_TOPIC.test(prompt) &&
    (IMAGE_NOUN_LEAD.test(prompt) ||
      DRAW_VERBS.test(prompt) ||
      (IMAGE_VERBS.test(prompt) && IMAGE_NOUNS.test(prompt)));

  // ---- PDF / document intent ----
  const hasPdfIntent = /\bpdf\b/i.test(prompt);
  const hasDocIntent =
    !hasCreative && CREATE_VERBS.test(prompt) && DOC_NOUNS.test(prompt);

  // ---- PPT intent ----
  const hasPptIntent =
    !hasCreative &&
    ((CREATE_VERBS.test(prompt) && PPT_NOUNS.test(prompt)) ||
      PPT_LEAD.test(prompt));

  // ---- Coding intent (web-UI capable) ----
  const hasWebUiIntent = WEB_UI_NOUNS.test(prompt);
  const hasCodeIntent =
    !hasCreative &&
    !hasPptIntent &&
    !hasDocIntent &&
    !hasImageIntent &&
    ((LANGUAGES.test(prompt) &&
      (CODE_VERBS.test(prompt) || CODE_NOUNS.test(prompt) || hasWebUiIntent)) ||
      (CODE_VERBS.test(prompt) && CODE_NOUNS.test(prompt)) ||
      (hasWebUiIntent && CODE_VERBS.test(prompt)));

  // ---- Route: explicit artifacts first, then search, falling back to chat. ----
  if (hasImageIntent) {
    targetAgent = "imageGen";
  } else if (hasPdfIntent || hasDocIntent) {
    targetAgent = "pdf";
  } else if (hasPptIntent) {
    targetAgent = "ppt";
  } else if (hasCodeIntent) {
    // e.g. "build a calculator in HTML" → coding + live preview
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
