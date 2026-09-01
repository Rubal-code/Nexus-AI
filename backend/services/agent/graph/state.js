import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  prompt: Annotation(),
  conversationId: Annotation(),
  targetAgent: Annotation(),
  searchQuery: Annotation(),
  searchResult: Annotation(),
  output: Annotation(),
  artifact: Annotation({
    reducer: (left, right) => right ?? left ?? null,
    default: () => null,
  }),
  messages: Annotation({
    reducer: (left, right) => {
      const leftArr = Array.isArray(left) ? left : [];
      const rightArr = Array.isArray(right) ? right : [right];
      return leftArr.concat(rightArr);
    },
    default: () => [],
  }),
});
