import { generateStructuredJson } from "../../utils/structuredLlm.js";
import { generateContent } from "../../utils/llm.js";
import { generatePptxBuffer } from "../../utils/pptGen.js";
import { saveArtifact, createArtifact } from "../../utils/artifactStore.js";
import { getConversationHistory, appendToMemory } from "../../utils/memory.js";

const SYSTEM_PROMPT = `You are Nexus AI's Presentation & Slide Architect.
Design a professional, visually-driven slide deck for the requested topic.
Slides must be engaging and concise (3-5 short bullets per slide).
Always include: 1 title slide, 1 agenda slide, 2-4 content slides, and 1 closing slide.

Return ONLY a strict JSON array in this exact shape — no markdown, no commentary:

[
  {"title": "Slide title", "bullets": ["bullet one", "bullet two"], "notes": "speaker note"}
]`;

const FALLBACK_DECK = [
  { title: `${"PPTX"}: Overview`, bullets: [`Topic: ${"PPTX"}`, "Agenda and objectives", "Key takeaway preview"], notes: "Welcome and set expectations." },
  { title: "Agenda", bullets: ["Introduction", "Core concepts", "Analysis", "Conclusion"], notes: "Walk through the agenda." },
  { title: "Core Analysis", bullets: ["Primary drivers and trends", "Competitive landscape", "Opportunities and risks"], notes: "Highlight the main findings." },
  { title: "Recommendations", bullets: ["Actionable next steps", "Measurable milestones", "Owner and timeline"], notes: "Detail the recommended path." },
  { title: "Conclusion", bullets: ["Summary of key points", "Thank you", "Q&A"], notes: "Wrap up." },
];

export async function pptNode(state) {
  console.log(`[PPT Agent] Generating real .pptx for: "${state.prompt}"`);

  let artifact = null;
  let finalOutput = `### Presentation Generation\n\nBuilding a PowerPoint deck for **"${state.prompt}"**...`;

  try {
    const history = await getConversationHistory(state.conversationId);

    let slides = await generateStructuredJson({
      systemPrompt: SYSTEM_PROMPT,
      prompt: `Create a presentation about: ${state.prompt}\n\nCreate between 5 and 8 slides that cover the topic in depth.`,
      history,
      temperature: 0.6,
      maxOutputTokens: 4096,
    });

    if (!Array.isArray(slides) || slides.length === 0 || !slides.every((s) => s && s.title)) {
      console.warn("[PPT Agent] LLM returned invalid deck, using fallback.");
      slides = FALLBACK_DECK.map((s) => ({
        title: s.title.replace("PPTX", state.prompt),
        bullets: s.bullets,
        notes: s.notes,
      }));
    } else {
      slides = slides.slice(0, 10).map((s) => ({
        title: String(s.title || "Untitled Slide").slice(0, 60),
        bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 6).map(String),
        notes: String(s.notes || "").slice(0, 500),
      }));
    }

    const { buffer, slideCount } = await generatePptxBuffer(slides);

    const stored = await saveArtifact({
      data: buffer,
      filename: `nexus-deck-${Date.now()}.pptx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    artifact = createArtifact({
      artifactType: "pptx",
      name: stored.name,
      mimeType: stored.mimeType,
      url: stored.url,
      previewType: "slides",
      metadata: {
        slideCount,
        slides,
        title: slides[0]?.title || state.prompt,
        generatedAt: new Date().toISOString(),
      },
    });

    finalOutput = `### Presentation Ready\n\nYour PowerPoint deck **"${slides[0]?.title || "Untitled"}"** has been generated with **${slideCount} slides**.\n\nPreview the slides above, or use the *Open* / *Download* actions to access the .pptx file.`;
    console.log(`[PPT Agent] Artifact stored: ${stored.name} (${slideCount} slides)`);
  } catch (error) {
    console.error(`[PPT Agent] Generation failed: ${error.message}`);
    finalOutput = `### Presentation Generation Failed\n\nI couldn't produce the PowerPoint deck right now.\n\n**Reason:** ${error.message || "Unknown error"}`;
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
        sender: "PPT Agent",
        content: finalOutput,
      },
    ],
  };
}