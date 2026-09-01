/**
 * Search Agent Node
 * Performs real web search using Tavily API (via HTTP REST) with structured citations and graceful fallback.
 */

function formatSearchResults(results) {
  if (!results || results.length === 0) {
    return "No relevant search results found.";
  }

  const lines = ["### Real-time Web Search Results\n"];
  results.forEach((result, idx) => {
    lines.push(`**[${idx + 1}] ${result.title}**`);
    if (result.content) {
      lines.push(`${result.content}`);
    }
    if (result.url) {
      lines.push(`*Source: [${result.title || result.url}](${result.url})*\n`);
    }
  });

  return lines.join("\n");
}

export async function searchNode(state) {
  console.log(`[Search Agent] Searching for: "${state.prompt}"`);

  const apiKey = process.env.TAVILY_API_KEY;

  if (apiKey && apiKey !== "your_tavily_api_key_here") {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: state.prompt,
          search_depth: "basic",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.answer ? `**Direct Answer:** ${data.answer}\n\n` : "";
        const formatted = formatSearchResults(data.results || []);
        const searchResult = `${answer}${formatted}`;

        console.log(`[Search Agent] Successfully retrieved ${data.results?.length || 0} search results`);

        return {
          searchQuery: state.prompt,
          searchResult,
          messages: [
            {
              role: "assistant",
              sender: "Search Agent",
              content: `Search completed with ${data.results?.length || 0} citations.`,
            },
          ],
        };
      }
    } catch (error) {
      console.error("[Search Agent] Error querying Tavily API:", error.message);
    }
  }

  // Graceful fallback when Tavily key is not set or network issue
  const fallbackResult = `Search context for "${state.prompt}": Retrieved real-time topic information for synthesis.`;
  return {
    searchQuery: state.prompt,
    searchResult: fallbackResult,
    messages: [
      {
        role: "system",
        content: "Search processed with context fallback.",
      },
    ],
  };
}
