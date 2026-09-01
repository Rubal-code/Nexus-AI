import { generateImage } from "../../utils/imageGen.js";
import { saveArtifact, createArtifact } from "../../utils/artifactStore.js";
import { getConversationHistory, appendToMemory } from "../../utils/memory.js";

/**
 * Image Agent Node
 * Generates a REAL image using Google Imagen (GEMINI_API_KEY), stores it,
 * and returns a unified artifact object. The optimized prompt used to render
 * the image is kept as optional metadata.
 */
export async function imageGenNode(state) {
  console.log(`[ImageGen Agent] Generating real image for: "${state.prompt}"`);

  let artifact = null;
  let finalOutput = `### Image Generation\n\nGenerating an image for **"${state.prompt}"**...`;

  try {
    const history = await getConversationHistory(state.conversationId);
    const result = await generateImage({
      prompt: state.prompt,
      history,
      temperature: 0.8,
    });

    if (result.ok) {
      const stored = await saveArtifact({
        data: result.data,
        filename: `nexus-image-${Date.now()}.png`,
        mimeType: "image/png",
      });

      artifact = createArtifact({
        artifactType: "image",
        name: stored.name,
        mimeType: stored.mimeType,
        url: stored.url,
        previewType: "image",
        metadata: {
          prompt: state.prompt,
          optimizedPrompt: result.optimizedPrompt,
          aspectRatio: result.aspectRatio,
          model: result.model,
          generatedAt: new Date().toISOString(),
        },
      });

      finalOutput = `Here is the generated image for **"${state.prompt}"**.`;
      console.log(`[ImageGen Agent] Artifact stored: ${stored.name}`);
    } else {
      console.error(`[ImageGen Agent] Generation failed: ${result.error}`);
      finalOutput =
        `### Image Generation Failed\n\nI couldn't generate that image right now.\n\n` +
        `**What happened:** ${result.error}\n\n` +
        `**Optimized prompt for your own generator:**\n\n\`\`\`text\n${result.optimizedPrompt}\n\`\`\``;
    }
  } catch (error) {
    console.error(`[ImageGen Agent] Unexpected error: ${error.message}`);
    finalOutput = `### Image Generation Failed\n\nI couldn't generate that image due to an internal error. Please try again.`;
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
        sender: "ImageGen Agent",
        content: finalOutput,
      },
    ],
  };
}