// Tokans — 7-slide pitch deck. Light theme (sky-blue + amber) from the website tokens.
// Default Office fonts; diagrams drawn as NATIVE pptx shapes; real photos/icons embedded.
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..", "..");           // website/
const IMG = (p) => path.join(ROOT, "public", "images", p);
const ICON = (p) => path.join(ROOT, "public", "app-icons", p);
const OUT = path.join(ROOT, "docs", "Tokans_Pitch_7Slide.pptx");

// ── Palette (verbatim from src/tailwind.css :root) ──
const C = {
  bg: "FEFEFE", bgAlt: "F0F7FF", bgSubtle: "F8FAFC", white: "FFFFFF",
  ink: "0C1929", inkMuted: "3C5575", inkFaint: "8AAAC8",
  sky: "0EA5E9", skyDark: "0369A1", skyLight: "E0F2FE",
  amber: "F59E0B", amberDark: "B45309", amberLight: "FEF3C7",
  verified: "059669", verifiedBg: "ECFDF5", warning: "DC2626",
  border: "CBD9E8",
};
// Default-installed Office/Windows fonts (nearest fit to the website's web fonts)
const HEAD = "Segoe UI";   // ← Syne
const TITLE = "Cambria";   // ← Playfair Display (elegant serif)
const BODY = "Calibri";    // ← DM Sans
const MONO = "Consolas";   // ← DM Mono

const shadow = () => ({ type: "outer", color: "0C1929", blur: 9, offset: 3, angle: 45, opacity: 0.16 });
const hx = (k) => C[k] || k;

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
const W = 13.333;
const SH = pptx.ShapeType;

// ───────────────────────── shared helpers ─────────────────────────
function splitGeom(side) {
  const imgW = 6.05, m = 0.5, gap = 0.45;
  if (side === "LEFT") return { imgX: m, imgW, txtX: m + imgW + gap, txtW: W - (m + imgW + gap) - m };
  const txtX = m, txtW = W - 2 * m - imgW - gap;
  return { imgX: W - m - imgW, imgW, txtX, txtW };
}
const SECTION = (s, x, label) => s.addText(label,
  { x, y: 0.55, w: 6, h: 0.35, fontFace: MONO, fontSize: 11, bold: true, color: C.sky, charSpacing: 3 });

// rounded panel card; returns the padded inner drawing region
function panelCard(s, x, w) {
  s.addShape(SH.roundRect, { x, y: 0.5, w, h: 6.5, rectRadius: 0.12, fill: { color: C.bgAlt }, line: { color: C.border, width: 1 }, shadow: shadow() });
  return { rx: x + 0.32, ry: 0.82, rw: w - 0.64, rh: 5.86 };
}
// photo panel — image fills the card as a clean rounded rectangle
function photoPanel(s, file, x, w) {
  s.addShape(SH.roundRect, { x, y: 0.5, w, h: 6.5, rectRadius: 0.12, fill: { color: C.bgAlt }, line: { color: C.border, width: 1 }, shadow: shadow() });
  s.addImage({ path: file, x: x + 0.14, y: 0.64, w: w - 0.28, h: 6.22, sizing: { type: "cover", w: w - 0.28, h: 6.22 } });
}
// arrow from (x1,y1) to (x2,y2) with the head at the destination
function arrow(s, x1, y1, x2, y2, color, dash) {
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  const w = Math.max(Math.abs(x2 - x1), 0.001), h = Math.max(Math.abs(y2 - y1), 0.001);
  s.addShape(SH.line, { x, y, w, h, flipH: x2 < x1, flipV: y2 < y1, line: { color, width: 2.25, dashType: dash || "solid", endArrowType: "triangle" } });
}
const chip = (s, x, y, w, h, fill, line, txt, col, fs) =>
  (s.addShape(SH.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: line ? { color: line, width: 1.25 } : { type: "none" } }),
   s.addText(txt, { x, y, w, h, align: "center", valign: "middle", fontFace: HEAD, bold: true, fontSize: fs || 13, color: col }));

// ───────────────────────── native diagrams ─────────────────────────
function drawAttack(s, r) {
  const cx = r.rx + r.rw / 2;
  s.addText("A floor — but breaches still happen.", { x: r.rx, y: r.ry, w: r.rw, h: 0.32, align: "center", fontFace: BODY, fontSize: 11.5, color: C.inkMuted });
  const vw = 2.7, vh = 1.05, vx = cx - vw / 2, vy = r.ry + 2.25;
  // arrows in first so the vault sits on top
  arrow(s, cx, r.ry + 1.0, cx, vy - 0.06, C.warning, "dash");
  arrow(s, r.rx + 0.15, r.ry + 1.15, vx - 0.06, vy + 0.25, C.warning, "dash");
  arrow(s, r.rx + r.rw - 0.15, r.ry + 1.15, vx + vw + 0.06, vy + 0.25, C.warning, "dash");
  arrow(s, r.rx + 0.25, r.ry + r.rh - 0.55, vx + 0.3, vy + vh + 0.06, C.warning, "dash");
  s.addText("AI-assisted attack", { x: cx - 1.1, y: r.ry + 0.62, w: 2.2, h: 0.3, align: "center", fontFace: MONO, fontSize: 10.5, bold: true, color: C.warning });
  s.addText("cheap", { x: r.rx, y: r.ry + 0.95, w: 1.2, h: 0.3, fontFace: MONO, fontSize: 10.5, bold: true, color: C.warning });
  s.addText("fast", { x: r.rx + r.rw - 1.2, y: r.ry + 0.95, w: 1.2, h: 0.3, align: "right", fontFace: MONO, fontSize: 10.5, bold: true, color: C.warning });
  s.addText("inevitable", { x: r.rx + 0.05, y: r.ry + r.rh - 0.5, w: 1.5, h: 0.3, fontFace: MONO, fontSize: 10.5, bold: true, color: C.warning });
  s.addShape(SH.roundRect, { x: vx, y: vy, w: vw, h: vh, rectRadius: 0.06, fill: { color: C.white }, line: { color: C.warning, width: 2.25 }, shadow: shadow() });
  s.addText([{ text: "CENTRAL VAULT\n", options: { bold: true, fontSize: 17, color: C.ink, fontFace: HEAD } },
             { text: "Millions of records", options: { fontSize: 11, color: C.inkMuted, fontFace: BODY } }],
    { x: vx, y: vy, w: vw, h: vh, align: "center", valign: "middle" });
  chip(s, cx - 1.7, vy + vh + 0.5, 3.4, 0.62, C.amberLight, C.amber, "Prize  >  Cost of attack", C.amberDark, 14);
}

function drawMesh(s, r) {
  const cx = r.rx + r.rw / 2, cy = r.ry + r.rh / 2 - 0.05;
  const Rx = r.rw / 2 - 0.55, Ry = r.rh / 2 - 0.7, n = 6, d = 0.78;
  const pts = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; pts.push([cx + Rx * Math.cos(a), cy + Ry * Math.sin(a)]); }
  // mesh links (no central hub)
  const link = (i, j) => arrow(s, pts[i][0], pts[i][1], pts[j][0], pts[j][1], C.sky).line;
  for (let i = 0; i < n; i++) s.addShape(SH.line, { x: Math.min(pts[i][0], pts[(i + 1) % n][0]), y: Math.min(pts[i][1], pts[(i + 1) % n][1]), w: Math.max(Math.abs(pts[i][0] - pts[(i + 1) % n][0]), 0.001), h: Math.max(Math.abs(pts[i][1] - pts[(i + 1) % n][1]), 0.001), flipH: pts[(i + 1) % n][0] < pts[i][0], flipV: pts[(i + 1) % n][1] < pts[i][1], line: { color: C.sky, width: 1, transparency: 55 } });
  for (let i = 0; i < n; i++) { const j = (i + 2) % n; s.addShape(SH.line, { x: Math.min(pts[i][0], pts[j][0]), y: Math.min(pts[i][1], pts[j][1]), w: Math.max(Math.abs(pts[i][0] - pts[j][0]), 0.001), h: Math.max(Math.abs(pts[i][1] - pts[j][1]), 0.001), flipH: pts[j][0] < pts[i][0], flipV: pts[j][1] < pts[i][1], line: { color: C.sky, width: 1, transparency: 70 } }); }
  // nodes
  pts.forEach(([x, y]) => {
    s.addShape(SH.ellipse, { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: C.white }, line: { color: C.sky, width: 2 } });
    s.addShape(SH.roundRect, { x: x - 0.16, y: y - 0.2, w: 0.32, h: 0.4, rectRadius: 0.04, fill: { type: "none" }, line: { color: C.skyDark, width: 1.75 } });
  });
  // centre message (over the empty middle — there is no hub)
  s.addShape(SH.roundRect, { x: cx - 1.5, y: cy - 0.62, w: 3.0, h: 1.24, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.border, width: 1 } });
  s.addText([{ text: "No central target.\n", options: { bold: true, fontSize: 16, color: C.skyDark, fontFace: HEAD } },
             { text: "Each device is its own vault.", options: { fontSize: 11, color: C.inkMuted, fontFace: BODY } }],
    { x: cx - 1.5, y: cy - 0.62, w: 3.0, h: 1.24, align: "center", valign: "middle" });
  chip(s, cx - 1.7, r.ry + r.rh - 0.5, 3.4, 0.6, C.verifiedBg, C.verified, "Prize  <  Cost of attack  ✓", C.verified, 13.5);
}

function drawGrid(s, r) {
  s.addText("Seeded by us · grown by partners", { x: r.rx, y: r.ry, w: r.rw, h: 0.32, align: "center", fontFace: BODY, fontSize: 12, color: C.inkMuted });
  const apps = [
    { name: "myFinance", icon: ICON("myfinance.png"), status: "LIVE", color: C.sky },
    { name: "myHealth", icon: ICON("myhealth.png"), status: "SOON", color: C.verified },
    { name: "myMemories", icon: ICON("mymemories.png"), status: "SOON", color: C.amber },
    { name: "myWork", icon: ICON("myworkassistant.png"), status: "SOON", color: C.skyDark },
    { name: "myDocs", glyph: "▢", status: "SOON", color: C.inkMuted },
    { name: "+ Your App", glyph: "+", status: "SUBMIT", color: C.sky, dashed: true },
  ];
  const cols = 3, gap = 0.2, top = r.ry + 0.5;
  const cw = (r.rw - gap * (cols - 1)) / cols, ch = 1.92;
  apps.forEach((a, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = r.rx + col * (cw + gap), y = top + row * (ch + 0.26);
    s.addShape(SH.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: a.dashed ? C.skyLight : C.white }, line: { color: a.color, width: a.status === "LIVE" ? 2.5 : 1.75, dashType: a.dashed ? "dash" : "solid" }, shadow: shadow() });
    if (a.icon) s.addImage({ path: a.icon, x: x + cw / 2 - 0.34, y: y + 0.22, w: 0.68, h: 0.68 });
    else s.addText(a.glyph, { x, y: y + 0.16, w: cw, h: 0.72, align: "center", valign: "middle", fontFace: HEAD, fontSize: a.glyph === "+" ? 40 : 34, bold: true, color: a.color });
    s.addText(a.name, { x, y: y + 0.96, w: cw, h: 0.34, align: "center", fontFace: HEAD, fontSize: 13.5, bold: true, color: C.ink });
    const bw = 1.0, by = y + ch - 0.52;
    const live = a.status === "LIVE";
    s.addShape(SH.roundRect, { x: x + cw / 2 - bw / 2, y: by, w: bw, h: 0.32, rectRadius: 0.16, fill: { color: live ? C.sky : C.skyLight }, line: { type: "none" } });
    s.addText(a.status, { x: x + cw / 2 - bw / 2, y: by, w: bw, h: 0.32, align: "center", valign: "middle", fontFace: MONO, fontSize: 10, bold: true, color: live ? C.white : C.skyDark });
  });
  s.addText("Built on sharedCoreLib", { x: r.rx, y: r.ry + r.rh - 0.3, w: r.rw, h: 0.3, align: "center", fontFace: MONO, fontSize: 11.5, bold: true, color: C.skyDark });
}

function drawFlywheel(s, r) {
  const cx = r.rx + r.rw / 2, cy = r.ry + r.rh / 2 + 0.18;
  s.addText("The Ecosystem Flywheel", { x: r.rx, y: r.ry, w: r.rw, h: 0.4, align: "center", fontFace: HEAD, fontSize: 17, bold: true, color: C.ink });
  const cd = 1.6, od = 1.18, dist = 2.0;
  const nodes = [
    { label: "Users", color: C.ink, x: cx, y: cy - dist },
    { label: "Builders", color: C.sky, x: cx + dist + 0.1, y: cy },
    { label: "Partners", color: C.amber, x: cx, y: cy + dist },
    { label: "Apps", color: C.verified, x: cx - dist - 0.1, y: cy },
  ];
  // circular flow arrows between consecutive nodes
  for (let i = 0; i < 4; i++) {
    const a = nodes[i], b = nodes[(i + 1) % 4];
    const ax = a.x + (b.x - a.x) * 0.32, ay = a.y + (b.y - a.y) * 0.32;
    const bx = a.x + (b.x - a.x) * 0.68, by = a.y + (b.y - a.y) * 0.68;
    arrow(s, ax, ay, bx, by, C.sky);
  }
  s.addShape(SH.ellipse, { x: cx - cd / 2, y: cy - cd / 2, w: cd, h: cd, fill: { color: C.white }, line: { color: C.sky, width: 3 }, shadow: shadow() });
  s.addText([{ text: "Tokans\n", options: { fontFace: TITLE, italic: true, bold: true, fontSize: 22, color: C.sky } },
             { text: "trust layer", options: { fontFace: BODY, fontSize: 11, color: C.inkMuted } }],
    { x: cx - cd / 2, y: cy - cd / 2, w: cd, h: cd, align: "center", valign: "middle" });
  nodes.forEach((nd) => {
    s.addShape(SH.ellipse, { x: nd.x - od / 2, y: nd.y - od / 2, w: od, h: od, fill: { color: C.white }, line: { color: nd.color, width: 2.5 } });
    s.addText(nd.label, { x: nd.x - od / 2, y: nd.y - od / 2, w: od, h: od, align: "center", valign: "middle", fontFace: HEAD, fontSize: 13, bold: true, color: C.ink });
  });
  s.addText("Every transaction builds trust.", { x: r.rx, y: r.ry + r.rh - 0.32, w: r.rw, h: 0.32, align: "center", fontFace: BODY, italic: true, fontSize: 12, color: C.inkMuted });
}

// list of {title, body} feature points into the text panel
function featureList(s, x, w, y0, items, accent, step) {
  let yy = y0;
  items.forEach(([t, b]) => {
    s.addText([{ text: t + "\n", options: { bold: true, color: accent, fontSize: 13.5 } },
               { text: b, options: { color: C.ink, fontSize: 11.5 } }],
      { x, y: yy, w, h: step, fontFace: BODY, lineSpacingMultiple: 1.04, valign: "top" });
    yy += step;
  });
}

// ───────────────────────── slides ─────────────────────────
function main() {
  // ===== SLIDE 1 — title =====
  let s = pptx.addSlide(); s.background = { color: C.bg };
  s.addShape(SH.ellipse, { x: 10.8, y: -1.6, w: 4.2, h: 4.2, fill: { color: C.skyLight } });
  s.addShape(SH.ellipse, { x: -1.4, y: 5.2, w: 3.6, h: 3.6, fill: { color: C.amberLight } });
  s.addImage({ path: IMG("logo.png"), x: 0.6, y: 0.55, w: 0.95, h: 0.95 });
  s.addText("TOKANS", { x: 1.7, y: 0.62, w: 5, h: 0.8, fontFace: HEAD, fontSize: 30, bold: true, color: C.ink, charSpacing: 4 });
  s.addText([
    { text: "AI needs ", options: {} }, { text: "Tokens", options: { color: C.skyDark } },
    { text: ".\nHumans need ", options: {} }, { text: "Tokans", options: { color: C.sky, underline: { color: C.amber }, italic: true } },
    { text: ".", options: {} },
  ], { x: 0.9, y: 2.3, w: 11.5, h: 2.2, fontFace: TITLE, italic: true, fontSize: 52, bold: true, color: C.ink, lineSpacingMultiple: 1.05 });
  s.addText("A privacy-native ecosystem where verified human expertise meets AI-built software.",
    { x: 0.95, y: 4.7, w: 9.5, h: 0.9, fontFace: BODY, fontSize: 18, color: C.inkMuted });
  s.addText("tokans.org", { x: 0.95, y: 6.45, w: 4, h: 0.5, fontFace: MONO, fontSize: 14, bold: true, color: C.sky });
  s.addNotes("Open with the tagline. AI consumes tokens; humans deserve Tokans — a privacy-native ecosystem. Set the frame: who owns data in an AI world.");

  // ===== SLIDE 2 — THE SHIFT (photo) =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  let g = splitGeom("LEFT");
  photoPanel(s, IMG("coding.png"), g.imgX, g.imgW);
  SECTION(s, g.txtX, "— 01  /  THE SHIFT");
  s.addText("Building apps is no longer a barrier.", { x: g.txtX, y: 1.0, w: g.txtW, h: 1.1, fontFace: HEAD, fontSize: 30, bold: true, color: C.ink });
  s.addShape(SH.roundRect, { x: g.txtX, y: 2.2, w: 2.6, h: 1.2, rectRadius: 0.08, fill: { color: C.amberLight }, line: { color: C.amber, width: 1.25 } });
  s.addText("7", { x: g.txtX + 0.05, y: 2.15, w: 1.0, h: 1.3, fontFace: TITLE, fontSize: 56, bold: true, color: C.amberDark, align: "center" });
  s.addText([{ text: "working apps\n", options: { bold: true, color: C.ink } }, { text: "built in one month · solo", options: { color: C.inkMuted, fontSize: 11 } }],
    { x: g.txtX + 1.05, y: 2.3, w: 1.5, h: 1.0, fontFace: BODY, fontSize: 13, valign: "middle" });
  s.addText([
    { text: "GenAI has collapsed the cost of app creation to near zero.\n\n", options: { color: C.ink } },
    { text: "A solo founder built 7 working apps in one month ", options: { color: C.ink } },
    { text: "alongside a full-time CTO role.\n\n", options: { italic: true, color: C.skyDark } },
    { text: "Finance · Health · Memories · Docs · Work · Hobbies · Education\n\n", options: { color: C.inkMuted, fontSize: 12 } },
    { text: "If building is trivial — who still pays for software, and why?\n", options: { italic: true, bold: true, color: C.amberDark } },
    { text: "For interconnected data and access to resources otherwise not easily available. However, …", options: { color: C.ink } },
  ], { x: g.txtX, y: 3.65, w: g.txtW, h: 3.2, fontFace: BODY, fontSize: 12.5, lineSpacingMultiple: 1.08 });
  s.addNotes("The shift: GenAI made building trivial. Proof — 7 apps in a month, solo, alongside a CTO job. Land the question: if building is free, where's the value? Begin answering it.");

  // ===== SLIDE 3 — THE PROBLEM (native attack diagram) =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  g = splitGeom("RIGHT");
  drawAttack(s, panelCard(s, g.imgX, g.imgW));
  SECTION(s, g.txtX, "— 02  /  THE PROBLEM");
  s.addText("The economics of data security are broken.", { x: g.txtX, y: 1.0, w: g.txtW, h: 1.1, fontFace: HEAD, fontSize: 28, bold: true, color: C.ink });
  featureList(s, g.txtX, g.txtW, 2.35, [
    ["Compliance is not enough", "GDPR and DPDP set a regulatory floor — but your data still sits on someone else's server. Delegation of risk, not ownership."],
    ["AI killed the cost of attacks", "Cyberattacks are now trivially cheap and fast. The limiting factor is simple economics."],
    ["Centralisation is the vulnerability", "Any vault holding millions of records is always worth attacking. The prize exceeds the cost of the key. Every time."],
  ], C.skyDark, 1.3);
  s.addText("Prize value > Cost of attack. The economics are broken.", { x: g.txtX, y: 6.55, w: g.txtW, h: 0.45, fontFace: BODY, italic: true, fontSize: 11, color: C.amberDark });
  s.addNotes("The problem isn't compliance — it's economics. AI makes attacks cheap; any central vault is a standing prize. End on prize > cost.");

  // ===== SLIDE 4 — THE SOLUTION (native mesh diagram) =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  g = splitGeom("LEFT");
  drawMesh(s, panelCard(s, g.imgX, g.imgW));
  SECTION(s, g.txtX, "— 03  /  THE SOLUTION");
  s.addText("Privacy as intrinsic architecture.", { x: g.txtX, y: 1.0, w: g.txtW, h: 1.0, fontFace: HEAD, fontSize: 28, bold: true, color: C.ink });
  featureList(s, g.txtX, g.txtW, 2.05, [
    ["Eliminate the central vault for personal data", "When data lives only on the user's own device, there is no central target worth attacking."],
    ["Each device is its own vault", "Distributed personal storage means the prize value of any single breach drops below the cost of the attack."],
    ["Only non-confidential data gets transferred", "To avoid tracking, additional data gets queried and the downloaded data gets filtered at the client."],
    ["Architecture is the guarantee", "Not because a company promises to behave — but because the structure makes data theft unviable."],
  ], C.verified, 1.08);
  s.addText("Privacy not as a policy. Privacy as a structural guarantee.", { x: g.txtX, y: 6.6, w: g.txtW, h: 0.4, fontFace: BODY, italic: true, fontSize: 11, color: C.amberDark });
  s.addNotes("The solution flips the economics: no central vault means no prize. Each device is its own encrypted vault; only non-confidential data ever leaves, filtered client-side. The guarantee is structural.");

  // ===== SLIDE 5 — THE ECOSYSTEM (native app grid + real icons) =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  g = splitGeom("RIGHT");
  drawGrid(s, panelCard(s, g.imgX, g.imgW));
  SECTION(s, g.txtX, "— 04  /  THE ECOSYSTEM");
  s.addText("Curated secure apps. Seeded by us. Grown by verified partners.", { x: g.txtX, y: 0.98, w: g.txtW, h: 1.3, fontFace: HEAD, fontSize: 25, bold: true, color: C.ink });
  let yy = 2.45;
  [["We seeded the ecosystem", "Finance, health, memories, documents, hobbies — the personal life stack."],
   ["Partners grow it", "Verified vibe coders and domain experts submit apps. We curate and approve every listing."],
   ["Built on sharedCoreLib", "Encrypted local storage, LAN sync, device-native architecture out of the box."],
   ["Users own their data", "Every app runs locally. No telemetry. No cloud dependency. Free to start."]].forEach(([t, b]) => {
    s.addText([{ text: "●  ", options: { color: C.sky, bold: true } }, { text: t + "  ", options: { bold: true, color: C.ink } }, { text: b, options: { color: C.inkMuted } }],
      { x: g.txtX, y: yy, w: g.txtW, h: 0.92, fontFace: BODY, fontSize: 12.5, lineSpacingMultiple: 1.02 });
    yy += 0.98;
  });
  s.addText("A great app built in isolation stays an island. Tokans connects it to the mainland.", { x: g.txtX, y: 6.55, w: g.txtW, h: 0.45, fontFace: BODY, italic: true, fontSize: 11, color: C.amberDark });
  s.addNotes("We seeded the marketplace with real apps across the life stack. Partners extend it; sharedCoreLib makes their apps private-by-default and fast-tracks approval.");

  // ===== SLIDE 6 — PLATFORM & BUSINESS (native flywheel) =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  g = splitGeom("LEFT");
  drawFlywheel(s, panelCard(s, g.imgX, g.imgW));
  SECTION(s, g.txtX, "— 05  /  PLATFORM & BUSINESS");
  s.addText("Netflix for apps — but the content is your own life.", { x: g.txtX, y: 0.98, w: g.txtW, h: 1.2, fontFace: HEAD, fontSize: 25, bold: true, color: C.ink });
  const tiers = [
    { label: "FREE", title: "Local Apps", accent: C.inkMuted, fill: C.bgSubtle, line: C.border, items: ["Full suite of privacy-first apps", "Data stays on your device", "No subscription required", "Become a partner — inside every app"] },
    { label: "SUBSCRIBER", title: "AI + Human Layer", accent: C.sky, fill: C.skyLight, line: C.sky, items: ["myLifeAssistant — personal AI + human services", "myWorkAssistant — distributed workflow", "Optional encrypted sync & backup", "Access to verified partner network"] },
  ];
  const tw = (g.txtW - 0.3) / 2;
  tiers.forEach((t, i) => {
    const x = g.txtX + i * (tw + 0.3);
    s.addShape(SH.roundRect, { x, y: 2.35, w: tw, h: 3.9, rectRadius: 0.1, fill: { color: t.fill }, line: { color: t.line, width: i === 1 ? 2.25 : 1.25 }, shadow: shadow() });
    s.addText(t.label, { x: x + 0.22, y: 2.5, w: tw - 0.44, h: 0.3, fontFace: MONO, fontSize: 10, bold: true, color: t.accent, charSpacing: 2 });
    s.addText(t.title, { x: x + 0.22, y: 2.8, w: tw - 0.44, h: 0.45, fontFace: HEAD, fontSize: 17, bold: true, color: C.ink });
    s.addText(t.items.map((it) => ({ text: it, options: { bullet: { code: "2022", indent: 14 }, color: C.ink } })),
      { x: x + 0.22, y: 3.35, w: tw - 0.44, h: 2.75, fontFace: BODY, fontSize: 11.5, lineSpacingMultiple: 1.12, paraSpaceAfter: 7 });
  });
  s.addText("Partners enter at zero cost · pay only as they consume services", { x: g.txtX, y: 6.5, w: g.txtW, h: 0.4, fontFace: BODY, italic: true, fontSize: 11, color: C.amberDark });
  s.addNotes("Free local apps build the install base; the AI + human layer is the subscription. Partners enter free, pay as they earn. The flywheel — users, builders, partners, apps — compounds trust.");

  // ===== SLIDE 7 — WHY US =====
  s = pptx.addSlide(); s.background = { color: C.bg };
  s.addShape(SH.roundRect, { x: 0.5, y: 0.5, w: 5.4, h: 6.5, rectRadius: 0.12, fill: { color: C.bgAlt }, line: { color: C.border, width: 1 }, shadow: shadow() });
  s.addShape(SH.roundRect, { x: 0.7, y: 0.7, w: 5.0, h: 2.7, rectRadius: 0.08, fill: { color: C.white }, line: { type: "none" } });
  s.addImage({ path: IMG("founder.png"), x: 0.7, y: 0.7, w: 5.0, h: 2.7, sizing: { type: "cover", w: 5.0, h: 2.7 } });
  s.addText("Anshuman Das", { x: 0.7, y: 3.52, w: 5.0, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.ink });
  s.addText([
    "IIT Delhi  ·  ISB Hyderabad", "20 years in financial technology", "CTO / CIO — MNC banks & retail brokerages",
    "300+ person technology teams", "HFT · trading platforms · risk systems at scale", "7 working apps built in one month",
  ].map((it) => ({ text: it, options: { bullet: { code: "2022", indent: 14 }, color: C.ink } })),
    { x: 0.72, y: 4.08, w: 5.0, h: 2.8, fontFace: BODY, fontSize: 12.5, lineSpacingMultiple: 1.15, paraSpaceAfter: 5 });
  const rx = 6.3, rw = W - rx - 0.5;
  SECTION(s, rx, "— 06  /  WHY US");
  s.addText("The niche is growing.\nThe product suite is live.", { x: rx, y: 0.95, w: rw, h: 1.2, fontFace: HEAD, fontSize: 28, bold: true, color: C.ink, lineSpacingMultiple: 1.0 });
  let py = 2.55;
  [["myFinance", "Live · tokans.github.io/myFinance"], ["Tokans.org", "Platform onboarding live"],
   ["Kahaniverse", "Social storytelling · Tokans-powered"], ["myLife suite", "7 seeded apps · open source · Tauri"],
   ["sharedCoreLib", "Encrypted local DB · LAN sync · device-native"]].forEach(([l, n]) => {
    s.addShape(SH.roundRect, { x: rx, y: py, w: rw, h: 0.62, rectRadius: 0.07, fill: { color: C.bgSubtle }, line: { color: C.border, width: 1 } });
    s.addText([{ text: l + "    ", options: { bold: true, color: C.skyDark } }, { text: n, options: { color: C.ink } }],
      { x: rx + 0.2, y: py, w: rw - 0.4, h: 0.62, fontFace: BODY, fontSize: 12.5, valign: "middle" });
    py += 0.72;
  });
  s.addShape(SH.roundRect, { x: rx, y: py + 0.1, w: rw, h: 1.0, rectRadius: 0.1, fill: { color: C.ink } });
  s.addText([{ text: "AI needs Tokens.   ", options: { color: C.white } }, { text: "Humans need Tokans.", options: { color: C.sky, italic: true } }],
    { x: rx + 0.2, y: py + 0.1, w: rw - 0.4, h: 1.0, fontFace: TITLE, fontSize: 20, bold: true, valign: "middle", align: "center" });
  s.addNotes("Close on proof, not promise: live products across finance, platform, storytelling, plus the open core. End on the tagline — the natural next step, not a pivot.");

  return pptx.writeFile({ fileName: OUT });
}
main().then(() => console.log("WROTE " + OUT)).catch((e) => { console.error(e); process.exit(1); });
