/**
 * pdfGen.js
 * Generates a real PDF document (pdf-lib) from markdown content produced by
 * the PDF Agent.
 *
 * NOTE: pdf-lib's standard fonts only support WinAnsi (Latin-1) encoding.
 * LLM output frequently contains Unicode symbols (arrows, checkmarks, math
 * symbols, emoji, non-Latin scripts) that would make `drawText` throw
 * "WinAnsi cannot encode ...". Every string drawn into the PDF therefore
 * goes through `sanitizeText()` which maps common symbols to ASCII
 * equivalents and drops anything the standard fonts cannot encode.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ACCENT = rgb(79 / 255, 70 / 255, 229 / 255); // Nexus indigo
const DARK = rgb(15 / 255, 18 / 255, 26 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);

/** Common Unicode symbols found in LLM output -> ASCII equivalents. */
const CHAR_MAP = {
  "\u2192": "->", // →
  "\u2190": "<-", // ←
  "\u21d2": "=>", // ⇒
  "\u2194": "<->", // ↔
  "\u2264": "<=", // ≤
  "\u2265": ">=", // ≥
  "\u2260": "!=", // ≠
  "\u2248": "~", // ≈
  "\u221e": "infinity", // ∞
  "\u2211": "sum", // ∑
  "\u221a": "sqrt", // √
  "\u00d7": "x", // ×
  "\u00f7": "/", // ÷
  "\u2212": "-", // −
  "\u2011": "-", // non-breaking hyphen
  "\u2713": "[yes]", // ✓
  "\u2714": "[yes]", // ✔
  "\u2717": "[no]", // ✗
  "\u2718": "[no]", // ✘
  "\u00a0": " ", // non-breaking space
  "\u03b1": "alpha", "\u03b2": "beta", "\u03b3": "gamma", "\u03b4": "delta",
  "\u03c0": "pi", "\u03bb": "lambda", "\u03bc": "u", "\u03a9": "Omega",
  "\u2126": "Ohm",
};

/** Characters WinAnsi standard fonts CAN encode (beyond \x20-\x7E and \xA0-\xFF). */
const ALLOWED_CHAR =
  /[\x20-\x7E\xA0-\xFF\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u2013\u2014\u02C6\u02DC\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u20AC\u2122]/;

/**
 * Make text safe for pdf-lib standard fonts (WinAnsi encoding):
 * maps known symbols to ASCII and strips everything else (emoji,
 * CJK, Devanagari, control chars, lone surrogates, etc.).
 */
export function sanitizeText(text) {
  let out = "";
  for (const ch of String(text || "")) {
    if (ALLOWED_CHAR.test(ch)) {
      out += ch;
      continue;
    }
    const mapped = CHAR_MAP[ch];
    if (mapped) out += mapped;
    // Anything else (emoji, unsupported scripts, control chars) is dropped.
  }
  return out;
}

/** Strip inline markdown (bold, italics, links, backticks) to plain text. */
function stripInline(text) {
  return sanitizeText(
    String(text || "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`#>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Simple markdown block parser. */
function parseMarkdown(md) {
  const blocks = [];
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: stripInline(heading[2]) });
      i++;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(stripInline(lines[i].replace(/^\s*[-*+]\s+/, "")));
        i++;
      }
      blocks.push({ type: "bullet", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(stripInline(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
        i++;
      }
      blocks.push({ type: "ordered", items });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(stripInline(lines[i].replace(/^\s*>\s?/, "")));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^\s*```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(sanitizeText(lines[i]));
        i++;
      }
      i++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        const cells = lines[i]
          .split("|")
          .map((c) => stripInline(c))
          .filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""));
        if (!/^:?-{2,}:?$/.test(cells.join(""))) rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    const para = [stripInline(line)];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      para.push(stripInline(lines[i]));
      i++;
    }
    blocks.push({ type: "para", text: para.join(" ") });
  }

  return blocks;
}

export { parseMarkdown };
/**
 * Generate a PDF Buffer from markdown text.
 */
export async function generatePdfBuffer(markdown) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontSizes = { 1: 20, 2: 15, 3: 12.5, 4: 11 };

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const wrap = (text, f, size) => {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) <= CONTENT_WIDTH) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const drawText = (text, f, size, color = DARK) => {
    for (const line of wrap(text, f, size)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= size + 4;
    }
  };

  const blocks = parseMarkdown(markdown);

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const size = fontSizes[block.level] || 12;
        // Long headings must be wrapped, otherwise they overflow the page.
        const headingLines = wrap(block.text, bold, size);
        ensureSpace(headingLines.length * (size + 8) + 14);
        for (const hLine of headingLines) {
          page.drawText(hLine, {
            x: MARGIN,
            y,
            size,
            font: bold,
            color: block.level === 1 ? DARK : ACCENT,
          });
          y -= size + 6;
        }
        if (block.level === 1) {
          page.drawLine({
            start: { x: MARGIN, y },
            end: { x: MARGIN + 60, y },
            thickness: 3,
            color: ACCENT,
          });
          y -= 22;
        } else {
          y -= 6;
        }
        break;
      }
      case "para":
        drawText(block.text, font, 11);
        y -= 8;
        break;
      case "bullet": {
        for (const item of block.items) {
          const lines = wrap(item, font, 11);
          ensureSpace(lines.length * 15 + 5);
          page.drawText("\u2022", { x: MARGIN + 4, y: y - 2, size: 11, font: bold, color: ACCENT });
          for (const line of lines) {
            page.drawText(line, { x: MARGIN + 20, y, size: 11, font, color: DARK });
            y -= 15;
          }
        }
        y -= 6;
        break;
      }
      case "ordered": {
        block.items.forEach((item, idx) => {
          const lines = wrap(item, font, 11);
          ensureSpace(lines.length * 15 + 5);
          page.drawText(`${idx + 1}.`, { x: MARGIN + 4, y: y - 2, size: 11, font: bold, color: ACCENT });
          for (const line of lines) {
            page.drawText(line, { x: MARGIN + 24, y, size: 11, font, color: DARK });
            y -= 15;
          }
        });
        y -= 6;
        break;
      }
      case "quote": {
        const lines = wrap(block.text, font, 11);
        ensureSpace(lines.length * 16 + 8);
        page.drawRectangle({
          x: MARGIN,
          y: y - lines.length * 15 + 6,
          width: CONTENT_WIDTH,
          height: lines.length * 15 + 4,
          color: rgb(0.94, 0.93, 1),
        });
        page.drawLine({
          start: { x: MARGIN + 2, y: y + 2 },
          end: { x: MARGIN + 2, y: y - lines.length * 15 + 4 },
          thickness: 3,
          color: ACCENT,
        });
        for (const line of lines) {
          page.drawText(line, { x: MARGIN + 16, y, size: 11, font, color: MUTED });
          y -= 15;
        }
        y -= 4;
        break;
      }
      case "code": {
        const lines = block.text.split("\n").slice(0, 30);
        ensureSpace(lines.length * 13 + 16);
        const h = lines.length * 13 + 12;
        page.drawRectangle({
          x: MARGIN,
          y: y - h + 8,
          width: CONTENT_WIDTH,
          height: h,
          color: rgb(0.05, 0.06, 0.09),
        });
        let cy = y - 4;
        for (const line of lines) {
          page.drawText(line.slice(0, 90) || " ", {
            x: MARGIN + 10,
            y: cy,
            size: 9,
            font: mono,
            color: rgb(0.8, 0.83, 1),
          });
          cy -= 13;
        }
        y -= h + 10;
        break;
      }
      case "table": {
        const [header, ...body] = block.rows;
        if (!header) break;
        // Use the widest row so long body rows can't overflow the page.
        const colCount = Math.max(header.length, ...body.map((r) => r.length));
        const colWidth = CONTENT_WIDTH / colCount;
        const rowHeight = 24;
        ensureSpace((body.length + 1) * rowHeight + 30);

        page.drawRectangle({
          x: MARGIN,
          y: y - rowHeight + 4,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: ACCENT,
        });
        header.forEach((cell, idx) => {
          page.drawText(cell.slice(0, 24), {
            x: MARGIN + colWidth * idx + 6,
            y: y - rowHeight / 2 - 4,
            size: 9,
            font: bold,
            color: rgb(1, 1, 1),
          });
        });
        y -= rowHeight;

        body.slice(0, 12).forEach((row, ri) => {
          page.drawRectangle({
            x: MARGIN,
            y: y - rowHeight + 4,
            width: CONTENT_WIDTH,
            height: rowHeight,
            color: ri % 2 ? rgb(0.965, 0.96, 0.98) : rgb(1, 1, 1),
          });
          row.forEach((cell, idx) => {
            page.drawText(cell.slice(0, 24), {
              x: MARGIN + colWidth * idx + 6,
              y: y - rowHeight / 2 - 4,
              size: 9,
              font,
              color: DARK,
            });
          });
          y -= rowHeight;
        });
        y -= 10;
        break;
      }
      default:
        break;
    }
  }

  // Footer page numbers (pdf-lib has no alignment option, center manually)
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    const label = `Nexus AI  \u00b7  Page ${idx + 1} of ${pages.length}`;
    const labelWidth = font.widthOfTextAtSize(label, 8);
    p.drawText(label, {
      x: (PAGE_WIDTH - labelWidth) / 2,
      y: 24,
      size: 8,
      font,
      color: MUTED,
    });
  });

  return { buffer: await pdfDoc.save(), pageCount: pages.length };
}