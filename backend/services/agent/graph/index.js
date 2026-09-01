import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./state.js";
import { routerNode, routeDecision } from "./nodes/routerNode.js";
import { chatNode } from "./nodes/chatNode.js";
import { searchNode } from "./nodes/searchNode.js";
import { codingNode } from "./nodes/codingNode.js";
import { pdfNode } from "./nodes/pdfNode.js";
import { pptNode } from "./nodes/pptNode.js";
import { imageGenNode } from "./nodes/imageGenNode.js";

/**
 * Builds and compiles the LangGraph workflow structure.
 * 
 * Graph Structure:
 * START -> Router Agent -> (Conditional Routing)
 *   ├── 'chat'     -> Chat Agent     -> END
 *   ├── 'search'   -> Search Agent   -> Chat Agent -> END
 *   ├── 'coding'   -> Coding Agent   -> END
 *   ├── 'pdf'      -> PDF Agent      -> END
 *   ├── 'ppt'      -> PPT Agent      -> END
 *   └── 'imageGen' -> ImageGen Agent -> END
 */
export function buildAgentGraph() {
  const workflow = new StateGraph(StateAnnotation)
    // 1. Add all nodes to graph
    .addNode("routerAgent", routerNode)
    .addNode("chatAgent", chatNode)
    .addNode("searchAgent", searchNode)
    .addNode("codingAgent", codingNode)
    .addNode("pdfAgent", pdfNode)
    .addNode("pptAgent", pptNode)
    .addNode("imageGenAgent", imageGenNode)

    // 2. Set Entry Point: START -> routerAgent
    .addEdge(START, "routerAgent")

    // 3. Conditional Edge from Router Agent to destination agent nodes
    .addConditionalEdges(
      "routerAgent",
      routeDecision,
      {
        chat: "chatAgent",
        search: "searchAgent",
        coding: "codingAgent",
        pdf: "pdfAgent",
        ppt: "pptAgent",
        imageGen: "imageGenAgent",
      }
    )

    // 4. Edge from Search Agent -> Chat Agent (per diagram)
    .addEdge("searchAgent", "chatAgent")

    // 5. Edges from terminal agent nodes to END
    .addEdge("chatAgent", END)
    .addEdge("codingAgent", END)
    .addEdge("pdfAgent", END)
    .addEdge("pptAgent", END)
    .addEdge("imageGenAgent", END);

  return workflow.compile();
}

export const agentGraph = buildAgentGraph();
