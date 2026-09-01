import express from "express"
import { agentGraph } from "../graph/index.js"

const router = express.Router()

/**
 * POST /chat
 * Body: { prompt: string, conversationId: string }
 * Headers (injected by gateway): x-user-id
 *
 * Invokes the LangGraph agent workflow and returns the AI response.
 */
router.post("/chat", async (req, res) => {
    try {
        const { prompt, conversationId } = req.body
        const userId = req.headers["x-user-id"]

        if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
            return res.status(400).json({ message: "prompt is required" })
        }

        console.log(`[Agent Route] userId=${userId} | conv=${conversationId} | prompt="${prompt.slice(0, 80)}..."`)

        const result = await agentGraph.invoke({
            prompt: prompt.trim(),
            conversationId: conversationId || null,
        })

        return res.status(200).json({
            output: result.output,
            targetAgent: result.targetAgent,
            conversationId: conversationId || null,
            artifact: result.artifact || null,
        })
    } catch (error) {
        console.error("[Agent Route] Error:", error)
        return res.status(500).json({
            message: `Agent processing error: ${error.message}`,
        })
    }
})

export default router
