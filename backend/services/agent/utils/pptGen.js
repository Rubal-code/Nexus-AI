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
 *   { title, subtitle?: string, bullets: string[], notes?: string }
 */
export async function generatePptxBuffer(slides) {
  const pptx = new PptxGenJS();
  // IMPORTANT: the default LAYOUT_16x9 is only 10in wide, which made the
  // content boxes below (w: 12.4) overflow off the slide. Define a true
  // 16:9 layout at 13.333 x 7.5in so all coordinates fit.
  pptx.defineLayout({ name: "WIDE_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE_16x9";

  const total = (slides || []).length;

  (slides || []).forEach((slideData, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };
    const isFirst = index === 0 && slideData.subtitle;

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

    // Page number (bottom-right)
    slide.addText(`${index + 1} / ${total}`, {
      x: 12.15,
      y: 7.02,
      w: 1.0,
      h: 0.3,
      fontSize: 9,
      color: SLATE,
      align: "right",
    });

    if (isFirst) {
      // ---- Title slide: large centered title + tagline ----
      slide.addText(slideData.title || "Untitled Slide", {
        x: 0.9,
        y: 2.35,
        w: 11.5,
        h: 1.4,
        fontSize: 40,
        bold: true,
        color: WHITE,
        fontFace: "Arial",
      });
      slide.addShape("rect", {
        x: 0.95,
        y: 3.85,
        w: 1.8,
        h: 0.07,
        fill: { color: ACCENT },
        line: { color: ACCENT },
      });
      slide.addText(slideData.subtitle, {
        x: 0.9,
        y: 4.1,
        w: 11.5,
        h: 0.6,
        fontSize: 18,
        color: SLATE,
        fontFace: "Arial",
      });
    } else {
      // ---- Content slide ----
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

      // Bullets - font size adapts so 5-6 bullets never overflow
      const bullets = Array.isArray(slideData.bullets) ? slideData.bullets.slice(0, 6) : [];
      const fontSize = bullets.length >= 6 ? 14 : bullets.length >= 5 ? 15 : 16;

      slide.addText(
        bullets.map((b) => ({
          text: String(b),
          options: {
            bullet: { code: "2022", indent: 14 },
            breakLine: true,
            color: "E2E8F0",
          },
        })),
        {
          x: 0.75,
          y: 2.35,
          w: 11.9,
          h: 4.4,
          fontSize,
          valign: "top",
          lineSpacingMultiple: 1.15,
        }
      );
    }

    // Speaker notes
    if (slideData.notes) {
      slide.addNotes(String(slideData.notes));
    }
  });

  const buffer = await pptx.write("nodebuffer");
  return {
    buffer,
    slideCount: total,
    slides: (slides || []).map((s) => ({
      title: s.title || "Untitled Slide",
      subtitle: s.subtitle || "",
      bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 6) : [],
      notes: s.notes || "",
    })),
  };
}