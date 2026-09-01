/**
 * pptGen.js
 * Generates a real .pptx file (PptxGenJS) from a slide deck structure and
 * returns the buffer plus the normalized slide metadata used for previews.
 */
import PptxGenJS from "pptxgenjs";

const DARK_BG = "0F121A";
const PANEL_BG = "141824";
const WHITE = "FFFFFF";
const SLATE = "94A3B8";
const ACCENT = "6366F1";

/**
 * Build a .pptx Buffer from an array of:
 *   { title, bullets: string[], notes?: string }
 */
export async function generatePptxBuffer(slides) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  (slides || []).forEach((slideData, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };

    // Brand tag
    slide.addText(`NEXUS AI ${String(index + 1).padStart(2, "0")}`, {
      x: 0.55,
      y: 0.35,
      w: 4,
      h: 0.35,
      fontSize: 10,
      color: SLATE,
      charSpacing: 4,
      bold: true,
    });

    // Title
    slide.addText(slideData.title || "Untitled Slide", {
      x: 0.55,
      y: 1.0,
      w: 12.4,
      h: 0.9,
      fontSize: 30,
      bold: true,
      color: WHITE,
      fontFace: "Arial",
    });

    // Accent bar under title
    slide.addShape("rect", {
      x: 0.58,
      y: 1.95,
      w: 1.4,
      h: 0.06,
      fill: { color: ACCENT },
      line: { color: ACCENT },
    });

    // Bullets
    const bullets = Array.isArray(slideData.bullets) ? slideData.bullets.slice(0, 6) : [];
    const yStart = 2.35;
    const bulletGap = 0.62;

    slide.addText(
      bullets.map((b, i) => ({
        text: String(b),
        options: {
          bullet: { code: "2022", indent: 14 },
          breakLine: true,
          color: i % 2 === 0 ? WHITE : "CBD5E1",
        },
      })),
      {
        x: 0.75,
        y: yStart,
        w: 11.6,
        h: 2.4,
        fontSize: 16,
        valign: "top",
      }
    );

    // Speaker notes
    if (slideData.notes) {
      slide.addNotes(String(slideData.notes));
    }
  });

  const buffer = await pptx.write("nodebuffer");
  return {
    buffer,
    slideCount: (slides || []).length,
    slides: (slides || []).map((s) => ({
      title: s.title || "Untitled Slide",
      bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 6) : [],
      notes: s.notes || "",
    })),
  };
}