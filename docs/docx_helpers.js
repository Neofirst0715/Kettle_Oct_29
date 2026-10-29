const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, Footer, PageNumber, PageBreak,
} = require("docx");

const FONT = "Arial";
const W = 9360; // content width, US Letter with 1" margins
const ACC = "35665A", MUT = "6B726E", LINE = "D9D2C3", HEAD_BG = "E6EFE9", FILL_BG = "FFF4D6";

// ---------- helpers
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
function runs(s, base = {}) {
  // **bold** and [[TO FILL: ...]] markers
  const out = [];
  s.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/).forEach((part) => {
    if (!part) return;
    if (part.startsWith("**")) out.push(t(part.slice(2, -2), { ...base, bold: true }));
    else if (part.startsWith("[[")) out.push(t(part.slice(2, -2), { ...base, bold: true, highlight: "yellow" }));
    else out.push(t(part, base));
  });
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: runs(s, o.run || {}), spacing: { after: 120, line: 276 }, ...o.para });
const H1 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(s)], spacing: { before: 320, after: 140 } });
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s)], spacing: { before: 220, after: 100 } });
const B = (s, level = 0) => new Paragraph({ numbering: { reference: "bul", level }, children: runs(s), spacing: { after: 60, line: 264 } });
let numInst = 0, lastWasN = false;
const N = (s) => { if (!lastWasN) numInst++; lastWasN = true; const p = new Paragraph({ numbering: { reference: "num", level: 0, instance: numInst }, children: runs(s), spacing: { after: 60, line: 264 } }); p.__isN = true; return p; };
const Q = (s) => new Paragraph({ children: runs(s, { italics: true, color: "3D4743" }), indent: { left: 360 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACC, space: 10 } }, spacing: { after: 120 } });
const NOTE = (s) => new Paragraph({ children: runs(s, { size: 20 }), shading: { type: ShadingType.CLEAR, fill: FILL_BG, color: "auto" },
  spacing: { before: 60, after: 160 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: "C9A227", space: 8 } } });

function table(head, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.round((w / sum) * W));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (s, i, isHead) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: isHead ? { type: ShadingType.CLEAR, fill: HEAD_BG, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: String(s).split("\n").map((line) => new Paragraph({ children: runs(line, { size: 19, bold: isHead || undefined }), spacing: { after: 20 } })),
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true)) })]
      .concat(rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))),
  });
}
const _table = table;
const gap = () => new Paragraph({ children: [], spacing: { after: 80 } });


module.exports = { t, runs, P, H1, H2, B, N, Q, NOTE, table, gap, FONT, W, ACC, MUT, Footer, Paragraph, TextRun, PageNumber, AlignmentType, LevelFormat, Document, Packer, Table, newC: () => { const C = []; const _push = C.push.bind(C); C.push = (x) => { if (!(x && x.__isN)) lastWasN = false; _push(x); if (x instanceof Table) _push(new Paragraph({ children: [], spacing: { after: 120 } })); }; return C; } };

module.exports.save = function (title, children, out, footerText) {
  const fs = require("fs");
  const doc = new Document({
    creator: "Zhenzhao (Neo) Li", title,
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: "26302C" } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: FONT, color: ACC }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT, color: "26302C" }, paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(footerText + " · page ", { size: 16, color: MUT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUT })] })] }) },
      children,
    }],
  });
  return Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("written", out); });
};
