import React from "react";
import ImagePreview from "./ImagePreview";
import PDFPreview from "./PDFPreview";
import SlidePreview from "./SlidePreview";
import LiveCodePreview from "./LiveCodePreview";
import CodeViewer from "./CodeViewer";
import MarkdownRenderer from "./MarkdownRenderer";

/**
 * ArtifactRenderer
 * Drop-in dispatcher for unified artifact objects (see section 3/4).
 *
 * artifact.shape: {
 *   type: "artifact",
 *   artifactType: "image | pdf | pptx | code | html | other",
 *   name, mimeType, url,
 *   preview: { type: "image | pdf | slides | iframe | code | text" },
 *   metadata: {}
 * }
 */
export default function ArtifactRenderer({ artifact, onRegenerate }) {
  if (!artifact || artifact.type !== "artifact") return null;

  const { artifactType, preview } = artifact;
  const previewType = preview && preview.type;
  const files = artifact.metadata?.files || [];
  const codeBlocks =
    artifact.metadata?.code || files.map((f) => ({ language: f.language, content: f.content }));

  switch (artifactType) {
    case "image":
      return <ImagePreview artifact={artifact} onRegenerate={onRegenerate} />;

    case "pdf":
      return <PDFPreview artifact={artifact} />;

    case "pptx":
      return <SlidePreview artifact={artifact} />;

    case "html":
    case "code":
      if (previewType === "iframe") {
        return (
          <LiveCodePreview
            artifact={artifact}
            initialHtml={artifact.url ? null : undefined}
            files={codeBlocks.length ? codeBlocks : undefined}
            language={artifact.metadata?.language}
          />
        );
      }
      return <CodeViewer artifact={artifact} />;

    case "other":
    default:
      return <MarkdownRenderer artifact={artifact} />;
  }
}