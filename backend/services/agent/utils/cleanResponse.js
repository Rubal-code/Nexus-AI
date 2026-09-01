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
 * Main export: process and clean an AI response
 */
export function cleanResponse(rawText) {
    if (!rawText || typeof rawText !== "string") return ""

    let text = rawText

    // Step 1: Remove filler openers
    text = removeFillers(text)

    // Step 2: Normalize code blocks
    text = normalizeCodeBlocks(text)

    // Step 3: Collapse excessive blank lines
    text = collapseBlankLines(text)

    // Step 4: Normalize citation formats
    text = normalizeCitations(text)

    // Step 5: Final trim
    return text.trim()
}
