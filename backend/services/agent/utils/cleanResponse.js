/**
 * Cleans and normalizes AI response text for clean Markdown output.
 */

// Patterns for filler openers that add no value
const FILLER_OPENERS = [
    /^(Certainly|Sure|Of course|Absolutely|Great|Happy to help|I'd be happy to|I'll help|I can help)[!,.]?\s*/i,
    /^(As an AI( language model)?|As a large language model)[,.]?\s*/i,
    /^(Let me help you with that[.!]?\s*)/i,
    /^(Here('s| is) (a |an |your |the )?(detailed |comprehensive |complete )?(answer|response|explanation|breakdown|solution|code|result)[:.!]?\s*)/i,
]

// Trailing "offer" lines the model adds after the real answer ("Would you like
// me to...", "Let me know if..."). These add noise and are stripped so each
// response ends on the actual content (user explicitly asked for this).
const TRAILING_INVITE_LINE =
    /^\s*(?:Would you (?:like|want)|Let me know|Feel free to|Do you (?:want|need) me to|If you (?:need|want|have)|Should you (?:need|want|have)|Please don't hesitate|Don't hesitate|Happy to help|I(?:'d| would) be happy to|I hope (?:this|that) helps|Hope (?:this|that) helps)\b[^\n]*$/i

/** Remove trailing filler/offer lines so responses end on the real content. */
function stripTrailingFluff(text) {
    let out = String(text || "")
    for (let pass = 0; pass < 3; pass += 1) {
        const trimmed = out.replace(/\s+$/, "")
        const lines = trimmed.split("\n")
        const last = (lines[lines.length - 1] || "").trim()
        if (last && TRAILING_INVITE_LINE.test(last)) {
            lines.pop()
            out = lines.join("\n")
        } else {
            break
        }
    }
    return out.trim()
}

/**
 * Remove filler openers from the start of a response
 */
function removeFillers(text) {
    let result = text.trim()
    for (const pattern of FILLER_OPENERS) {
        result = result.replace(pattern, "")
    }
    return result.trim()
}

/**
 * Normalize code blocks — ensure language tag is lowercased
 * and there's no extra whitespace inside fences
 */
function normalizeCodeBlocks(text) {
    return text.replace(/```(\w*)\s*\n/g, (_, lang) => {
        return "```" + lang.toLowerCase() + "\n"
    })
}

/**
 * Remove duplicate blank lines (more than 2 consecutive newlines → max 2)
 */
function collapseBlankLines(text) {
    return text.replace(/\n{3,}/g, "\n\n")
}

/**
 * Fix citation formatting: [[1]](url) → [1](url)
 */
function normalizeCitations(text) {
    return text.replace(/\[\[(\d+)\]\]/g, "[$1]")
}

/**
 * For code-bearing responses, trim introductory prose (multi-line intros /
 * bullet lists the model adds before the first code fence) down to at most a
 * single one-line intro, so the answer starts cleanly at the code.
 */
function stripLeadingCodeProse(text) {
    const lines = String(text || "").split(/\r?\n/);
    const fenceIdx = lines.findIndex((l) => /^```[A-Za-z0-9_]/.test(l));
    if (fenceIdx <= 1) return text; // 0 or 1 leading line: nothing to trim
    // Keep the first non-empty line as a one-line intro, drop the rest.
    const intro = [];
    for (let i = 0; i < fenceIdx; i++) {
        if (lines[i].trim() !== "") {
            intro.push(lines[i]);
            break;
        }
    }
    return intro.concat(lines.slice(fenceIdx)).join("\n");
}

/**
 * Main export: process and clean an AI response
 */
export function cleanResponse(rawText) {
    if (!rawText || typeof rawText !== "string") return ""

    let text = rawText

    // Trim leading prose to the code fence so code answers have no intro
    // paragraphs / bullet lists before the ``` fence.
    text = stripLeadingCodeProse(text)

    // Step 1: Remove filler openers
    text = removeFillers(text)

    // Step 2: Normalize code blocks
    text = normalizeCodeBlocks(text)

    // Step 3: Collapse excessive blank lines
    text = collapseBlankLines(text)

    // Step 4: Normalize citation formats
    text = normalizeCitations(text)

    // Step 5: Strip trailing filler/offer lines ("Would you like me to...")
    text = stripTrailingFluff(text)

    // Step 6: Final trim
    return text.trim()
}
