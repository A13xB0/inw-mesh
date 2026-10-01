/* Squatch Mesh theme maker (/theme-maker).

   Pick colours, see them on the real screens, name the theme, and send it to a pager
   or T-Deck over USB (Web Serial). Nothing is uploaded: the design is kept in this
   browser, and the only place it is sent is down the cable.

   THE PREVIEW is the firmware's own screens, not a mock-up. The simulator draws each
   screen in fifteen dark colours, then again with one palette colour at a time nearly
   white; tools/theme_atlas.py turns those into, for every pixel, what is fixed and
   how much of each palette colour it takes (/assets/theme/theme-<board>-<look>.png).
   Nearly everything the screens do with a colour is a sum (a fill, a blend, a fade),
   so   pixel = fixed + sum(weight_i x colour_i)   gives any palette's picture to within
   a step or two of the real thing, in the screen's own 5-6-5 bits.

   THE DEVICE takes a theme as one line of text (src/theme_custom.h):
       theme-set 1 <look 0-3> <90 hex digits> <name>
   and answers "themes" with what it holds. Opening the port restarts the device (the
   same thing the installer sees), so the first question is asked again and again until
   it answers, and the port is then kept open for a few minutes so that sending a
   second try is instant. While it is open, everything the device says is read: a
   port held open but not read would make the device wait on its own log lines. */

const KEYS = ["bg", "panel", "line", "green", "greenDim", "txt", "dim", "amber", "red", "white",
              "bubbleIn", "bubbleOut", "blue", "focus", "mentionBg"];
const LABEL = {
  bg:        ["Background", "behind everything"],
  green:     ["Main colour", "titles, the clock, whatever is picked"],
  greenDim:  ["Second colour", "the character, channel icons, quiet accents"],
  txt:       ["Writing", "names and most of the words"],
  amber:     ["Highlight", "unread counts, mentions, warnings"],
  panel:     ["Cards and top bar", "tiles, cards, the bar across the top"],
  line:      ["Lines", "edges, dividers, the far hills"],
  dim:       ["Quiet writing", "times, hints, small print"],
  red:       ["Alerts", "a failed send, the NEW line, hearts"],
  white:     ["Message writing", "the words inside chat bubbles"],
  bubbleIn:  ["Their bubbles", "messages you receive"],
  bubbleOut: ["Your bubbles", "messages you send"],
  blue:      ["Blue", "links, marks on the map"],
  focus:     ["Picked row", "the chat or row you are on"],
  mentionBg: ["Mention bubble", "a message with your name in it"],
};
const MAIN = ["bg", "green", "greenDim", "txt", "amber"];
const OTHER = KEYS.filter((k) => !MAIN.includes(k));
const LOOK_NAMES = ["Squatch", "Blocks", "Hero", "Aurora"];
const LOOK_WHAT = ["pines, a ridge, the sasquatch", "a blocky world, a pixel moon", "night hills, a castle, hearts", "northern lights over a ridge"];
const LOOK_FILE = ["squatch", "blocks", "hero", "aurora"];
const BOARD_NAME = { pager: "Pager", tdeck: "T-Deck" };
const SCREEN_NAME = { lock: "Lock screen", home: "Home", chats: "Chats", thread: "A chat", settings: "Settings" };
const NAME_LEN = 20;
const ASSET_V = "1";

/* ---- colour arithmetic --------------------------------------------------------------- */
const rgb = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
const toHex = (c) => hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); };
function luminance(hex) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const c = rgb(hex);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

// The colours that follow the main five, and what each is made from. The amounts were
// fitted to the four built-in themes, so a theme made this way hangs together the way
// they do.
const RULE = {
  panel:     { from: ["bg", "txt"],   make: (c) => mix(c.bg, c.txt, 0.06) },
  line:      { from: ["bg", "txt"],   make: (c) => mix(c.bg, c.txt, 0.13) },
  dim:       { from: ["bg", "txt"],   make: (c) => mix(c.bg, c.txt, 0.5) },
  white:     { from: ["bg", "txt"],   make: (c) => mix(c.txt, luminance(c.bg) < 0.4 ? "ffffff" : "000000", 0.6) },
  bubbleIn:  { from: ["bg", "txt"],   make: (c) => mix(c.bg, c.txt, 0.09) },
  bubbleOut: { from: ["bg", "green"], make: (c) => mix(c.bg, c.green, 0.22) },
  focus:     { from: ["bg", "green"], make: (c) => mix(c.bg, c.green, 0.13) },
  mentionBg: { from: ["bg", "amber"], make: (c) => mix(c.bg, c.amber, 0.24) },
  red:       { from: ["bg"],          make: (c) => (luminance(c.bg) < 0.4 ? "ff5a5a" : "c62828") },
  blue:      { from: ["bg"],          make: (c) => (luminance(c.bg) < 0.4 ? "5aa9ff" : "1f5fbf") },
};

const PRESETS = [
  { name: "Sunset",    look: 3, c: { bg: "1a0f1f", green: "ff9e5e", greenDim: "b0477a", txt: "f6e1d0", amber: "ffd166" } },
  { name: "Ocean",     look: 0, c: { bg: "04121c", green: "4fd6ff", greenDim: "1f6f8f", txt: "cfe6f2", amber: "ffd27a" } },
  { name: "Moss",      look: 0, c: { bg: "0b1408", green: "a6e36a", greenDim: "55803c", txt: "dde8cf", amber: "f2c14e" } },
  { name: "Bubblegum", look: 2, c: { bg: "1b1022", green: "ff7ac8", greenDim: "7a5cff", txt: "f3e6ff", amber: "ffe066" } },
  { name: "Ember",     look: 1, c: { bg: "140a08", green: "ff6b3d", greenDim: "8f3b2a", txt: "f2ddd2", amber: "ffc857" } },
  { name: "Mono",      look: 0, c: { bg: "0a0a0a", green: "f2f2f2", greenDim: "8a8a8a", txt: "d6d6d6", amber: "ffffff" } },
  { name: "Paper",     look: 0, c: { bg: "f4efe6", green: "b3261e", greenDim: "7a5c58", txt: "2a2622", amber: "8a5a00" } },
];

/* ---- the theme being made ----------------------------------------------------------- */
let META = null;                                 // themes.json: screens, sizes, the built-in palettes
const state = {
  look: 0,
  name: "",
  colours: {},                                   // key -> "rrggbb"
  manual: new Set(),                             // followers the person has set by hand
  touched: false,                                // a main colour has been changed since the look was picked
  board: "pager",
  screen: "lock",
};
const STORE = "squatch-theme-draft";

function builtin(look) {
  const hex = META.builtin[look], out = {};
  KEYS.forEach((k, i) => { out[k] = hex.slice(i * 6, i * 6 + 6); });
  return out;
}
function follow(changed) {
  // Re-make the followers of the colours that changed (all of them, given none).
  for (const k of Object.keys(RULE)) {
    if (state.manual.has(k)) continue;
    if (changed && !RULE[k].from.some((f) => changed.includes(f))) continue;
    state.colours[k] = RULE[k].make(state.colours);
  }
}
function setLook(look) {
  // A look brings its own palette, exactly as built in, until a colour is changed.
  state.look = look;
  if (!state.touched) { state.colours = builtin(look); state.manual.clear(); }
}
function setColour(key, hex, byHand) {
  state.colours[key] = hex;
  if (MAIN.includes(key)) {
    state.touched = true;
    follow([key]);                               // only what is made from it: nothing else moves
  } else if (byHand) state.manual.add(key);
}
function cleanName(s) {
  // What the device will make of it (theme_custom.h cleanName), so the page shows the same.
  let out = "", space = false;
  for (const ch of String(s || "")) {
    const c = ch.codePointAt(0);
    if (ch === " " || ch === "\t") { space = out.length > 0; continue; }
    if (space) { out += " "; space = false; if (out.length >= NAME_LEN) break; }
    out += c < 0x20 || c > 0x7e ? "?" : ch;
    if (out.length >= NAME_LEN) break;
  }
  return out.replace(/ +$/, "") || "My theme";
}
const typedName = (s) => String(s || "").replace(/[^\x20-\x7e]/g, "").slice(0, NAME_LEN);
const hex90 = () => KEYS.map((k) => state.colours[k]).join("");
const themeLine = () => "1 " + state.look + " " + hex90() + " " + cleanName(state.name);

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ look: state.look, name: state.name, colours: state.colours,
      manual: [...state.manual], touched: state.touched, board: state.board }));
  } catch (e) { /* private mode: it just isn't kept */ }
}
function load(obj) {
  if (!obj || typeof obj !== "object") return false;
  const look = Number(obj.look);
  if (!(look >= 0 && look < 4)) return false;
  const c = {};
  for (const k of KEYS) {
    const v = obj.colours && String(obj.colours[k] || "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(v || "")) return false;
    c[k] = v;
  }
  state.look = look;
  state.colours = c;
  state.name = typedName(obj.name);
  state.manual = new Set((obj.manual || []).filter((k) => k in RULE));
  state.touched = obj.touched !== false;
  if (obj.board === "pager" || obj.board === "tdeck") state.board = obj.board;
  return true;
}
// A theme that arrives whole (a link, or one read back from the device): a follower
// that is close to what the main colours would make goes on following them, and one
// that was plainly set by hand stays as it is.
function setByHand(colours) {
  const out = [];
  for (const k of Object.keys(RULE)) {
    const a = rgb(colours[k]), b = rgb(RULE[k].make(colours));
    if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 28) out.push(k);
  }
  return out;
}
// A link holds the whole theme after the #, which a browser never sends to a server.
function fromHash() {
  const m = /^#t=1\.([0-3])\.([0-9a-fA-F]{90})\.(.*)$/.exec(location.hash);
  if (!m) return false;
  const colours = {};
  KEYS.forEach((k, i) => { colours[k] = m[2].slice(i * 6, i * 6 + 6).toLowerCase(); });
  let name = "";
  try { name = decodeURIComponent(m[3]); } catch (e) { name = ""; }
  return load({ look: +m[1], colours, name, manual: setByHand(colours), touched: true });
}
const shareLink = () => location.origin + location.pathname + "#t=1." + state.look + "." + hex90() + "." + encodeURIComponent(cleanName(state.name));

/* ---- the preview ------------------------------------------------------------------- */
const FULL = [31, 63, 31];
const atlases = new Map();                       // "pager-0" -> Promise of { w, h, screens: { lock: {...} } }
function loadAtlas(board, look) {
  const id = board + "-" + look;
  if (atlases.has(id)) return atlases.get(id);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const b = META.boards[board], w = b.w, h = b.h, n = w * h;
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const g = cv.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const screens = {};
        b.screens.forEach((name, s) => {
          // What is fixed, already times "all", so the sum below needs one division.
          const base = new Int32Array(n * 3), layers = [];
          const read = (k) => g.getImageData(s * w, k * h, w, h).data;
          const to565 = (d, out) => { for (let i = 0, o = 0; i < n * 4; i += 4, o += 3) { out[o] = (d[i] * 31 + 127) / 255 | 0; out[o + 1] = (d[i + 1] * 63 + 127) / 255 | 0; out[o + 2] = (d[i + 2] * 31 + 127) / 255 | 0; } };
          const f = new Uint8Array(n * 3);
          to565(read(0), f);
          for (let o = 0; o < n * 3; o += 3) { base[o] = f[o] * 31; base[o + 1] = f[o + 1] * 63; base[o + 2] = f[o + 2] * 31; }
          for (let i = 0; i < 15; i++) {
            const wgt = new Uint8Array(n * 3);
            to565(read(1 + i), wgt);
            let count = 0;
            for (let p2 = 0; p2 < n; p2++) if (wgt[p2 * 3] | wgt[p2 * 3 + 1] | wgt[p2 * 3 + 2]) count++;
            if (!count) { layers.push(null); continue; }
            const at = new Uint32Array(count);     // only the pixels this colour touches
            for (let p2 = 0, j = 0; p2 < n; p2++) if (wgt[p2 * 3] | wgt[p2 * 3 + 1] | wgt[p2 * 3 + 2]) at[j++] = p2;
            layers.push({ wgt, at });
          }
          screens[name] = { base, layers, acc: new Int32Array(n * 3) };
        });
        resolve({ w, h, screens });
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("picture didn't load"));
    img.src = "/assets/theme/theme-" + board + "-" + LOOK_FILE[look] + ".png?v=" + ASSET_V;
  });
  atlases.set(id, p);
  p.catch(() => atlases.delete(id));
  return p;
}

// One screen in the colours being made. spot: a colour to pick out (everything it
// doesn't touch goes dim), or -1.
function paint(canvas, atlas, screenName, spot) {
  const sc = atlas.screens[screenName];
  if (!sc) return;
  const { w, h } = atlas, n = w * h, acc = sc.acc;
  acc.set(sc.base);
  const pal = KEYS.map((k) => { const c = rgb(state.colours[k]); return [c[0] >> 3, c[1] >> 2, c[2] >> 3]; });   // as color565 cuts them
  for (let i = 0; i < 15; i++) {
    const L = sc.layers[i];
    if (!L) continue;
    const { wgt, at } = L, pr = pal[i][0], pg = pal[i][1], pb = pal[i][2];
    for (let j = 0; j < at.length; j++) {
      const o = at[j] * 3;
      acc[o] += wgt[o] * pr; acc[o + 1] += wgt[o + 1] * pg; acc[o + 2] += wgt[o + 2] * pb;
    }
  }
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const g = canvas.getContext("2d");
  const im = g.createImageData(w, h), d = im.data;
  let lit = null;
  if (spot >= 0 && sc.layers[spot]) {
    lit = new Uint8Array(n);
    const { wgt, at } = sc.layers[spot];
    for (let j = 0; j < at.length; j++) { const o = at[j] * 3; if (wgt[o] > 7 || wgt[o + 1] > 15 || wgt[o + 2] > 7) lit[at[j]] = 1; }
  }
  for (let p2 = 0, o = 0, q = 0; p2 < n; p2++, o += 3, q += 4) {
    let r = (acc[o] + 15) / 31 | 0, gg = (acc[o + 1] + 31) / 63 | 0, b = (acc[o + 2] + 15) / 31 | 0;
    if (r > 31) r = 31; if (gg > 63) gg = 63; if (b > 31) b = 31;
    r = (r << 3) | (r >> 2); gg = (gg << 2) | (gg >> 4); b = (b << 3) | (b >> 2);
    if (spot >= 0 && !(lit && lit[p2])) { r = r * 0.22 + 14; gg = gg * 0.22 + 14; b = b * 0.22 + 14; }
    d[q] = r; d[q + 1] = gg; d[q + 2] = b; d[q + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}

/* ---- the page ---------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let spot = -1, drawQueued = false;
const lookCanvas = [];
const swatchRows = {};                           // key -> { colour input, hex input, auto box }

function queueDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(async () => {
    drawQueued = false;
    try {
      const a = await loadAtlas(state.board, state.look);
      const screen = a.screens[state.screen] ? state.screen : "lock";
      paint($("tm-canvas"), a, screen, spot);
    } catch (e) { $("tm-failed").hidden = false; }
    // Each look's lock screen in these colours, on its button.
    for (let i = 0; i < 4; i++) {
      loadAtlas(state.board, i).then((a) => { if (lookCanvas[i]) paint(lookCanvas[i], a, "lock", -1); }).catch(() => {});
    }
  });
}

function refreshInputs() {
  for (const k of KEYS) {
    const row = swatchRows[k];
    if (!row) continue;
    row.colour.value = "#" + state.colours[k];
    if (document.activeElement !== row.hex) row.hex.value = "#" + state.colours[k];
    if (row.auto) row.auto.checked = !state.manual.has(k);
  }
  const name = $("tm-name");
  if (document.activeElement !== name) name.value = state.name;
  $("tm-count").textContent = state.name.length + "/" + NAME_LEN;
  document.querySelectorAll("#tm-looks .tm-look").forEach((b, i) => b.setAttribute("aria-checked", String(i === state.look)));
  document.querySelectorAll("#tm-boards button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.board === state.board)));
  const screens = META.boards[state.board].screens;
  if (!screens.includes(state.screen)) state.screen = "lock";
  const tabs = $("tm-screens");
  if (tabs.dataset.board !== state.board) {
    tabs.dataset.board = state.board;
    tabs.textContent = "";
    for (const s of screens) {
      const b = el("button", "", SCREEN_NAME[s] || s);
      b.type = "button"; b.dataset.screen = s; b.setAttribute("role", "tab");
      b.addEventListener("click", () => { state.screen = s; refreshInputs(); queueDraw(); });
      tabs.append(b);
    }
  }
  tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.screen === state.screen)));
  $("tm-screen-wrap").classList.toggle("tdeck", state.board === "tdeck");
  warn();
}

// Say so, gently, when something will be hard to read. It is their theme: nothing is refused.
function warn() {
  const c = state.colours, box = $("tm-warn");
  const checks = [
    [c.txt, c.bg, 4.5, "The writing is hard to read on that background."],
    [c.white, c.bubbleIn, 4.5, "Words inside chat bubbles are hard to read (Message writing on Their bubbles)."],
    [c.white, c.bubbleOut, 4, "Words inside your own bubbles are hard to read (Message writing on Your bubbles)."],
    [c.green, c.bg, 3, "The main colour hardly shows against the background."],
    [c.bg, c.amber, 3, "Unread counts are written in the background colour on the highlight: those two are too alike."],
    [c.dim, c.bg, 2.6, "Times and hints (Quiet writing) are faint on that background."],
  ];
  for (const [a, b, need, text] of checks) {
    if (contrast(a, b) < need) { box.textContent = text + " It will still send."; box.hidden = false; return; }
  }
  box.hidden = true;
}

function changed() { refreshInputs(); queueDraw(); save(); }

function swatch(key, withAuto) {
  const row = el("div", "tm-sw");
  const colour = el("input"); colour.type = "color"; colour.id = "tm-c-" + key; colour.setAttribute("aria-label", LABEL[key][0]);
  const text = el("label"); text.htmlFor = colour.id;
  text.append(el("span", "tm-sw-name", LABEL[key][0]), el("span", "tm-sw-what", LABEL[key][1]));
  const side = el("div", "tm-sw-side");
  let auto = null;
  if (withAuto) {
    const lab = el("label", "tm-sw-auto");
    auto = el("input"); auto.type = "checkbox";
    lab.append(auto, document.createTextNode("auto"));
    lab.title = "Follows your main colours";
    auto.addEventListener("change", () => {
      if (auto.checked) { state.manual.delete(key); state.colours[key] = RULE[key].make(state.colours); }
      else state.manual.add(key);
      changed();
    });
    side.append(lab);
  }
  const hexIn = el("input", "tm-sw-hex"); hexIn.type = "text"; hexIn.maxLength = 7; hexIn.spellcheck = false;
  hexIn.setAttribute("aria-label", LABEL[key][0] + " as a hex code");
  side.append(hexIn);
  row.append(colour, text, side);
  colour.addEventListener("input", () => { setColour(key, colour.value.slice(1).toLowerCase(), true); changed(); });
  hexIn.addEventListener("input", () => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hexIn.value.trim());
    if (m) { setColour(key, m[1].toLowerCase(), true); changed(); }
  });
  hexIn.addEventListener("blur", () => { hexIn.value = "#" + state.colours[key]; });
  // Point at a colour: the preview shows only where it is used.
  const on = () => { spot = KEYS.indexOf(key); queueDraw(); }, off = () => { if (spot === KEYS.indexOf(key)) { spot = -1; queueDraw(); } };
  row.addEventListener("pointerenter", on);
  row.addEventListener("pointerleave", off);
  swatchRows[key] = { colour, hex: hexIn, auto };
  return row;
}

function randomTheme() {
  const h = Math.random() * 360, light = Math.random() < 0.18;
  const c = light
    ? { bg: hsl(h, 30, 94), green: hsl(h + 150 + Math.random() * 60, 70, 36), greenDim: hsl(h + 40, 25, 45), txt: hsl(h, 20, 14), amber: hsl(h + 200, 80, 30) }
    : { bg: hsl(h, 35, 6 + Math.random() * 4), green: hsl(h + 130 + Math.random() * 100, 95, 66), greenDim: hsl(h + 40 + Math.random() * 60, 45, 45),
        txt: hsl(h, 22, 86), amber: hsl(h + 210 + Math.random() * 60, 95, 70) };
  applyMain(c, Math.floor(Math.random() * 4));
}
function applyMain(c, look) {
  state.look = look;
  state.manual.clear();
  state.touched = true;
  state.colours = Object.assign(builtin(look), c);
  follow(null);
}

function build() {
  const looks = $("tm-looks");
  LOOK_NAMES.forEach((name, i) => {
    const b = el("button", "tm-look"); b.type = "button"; b.setAttribute("role", "radio");
    const cv = el("canvas"); cv.width = META.boards.pager.w; cv.height = META.boards.pager.h; cv.setAttribute("aria-hidden", "true");
    lookCanvas[i] = cv;
    const t = el("span", "", name); t.append(el("small", "", LOOK_WHAT[i]));
    b.append(cv, t);
    b.addEventListener("click", () => { setLook(i); changed(); });
    looks.append(b);
  });
  for (const k of MAIN) $("tm-main").append(swatch(k, false));
  for (const k of OTHER) $("tm-all").append(swatch(k, true));

  const chips = $("tm-presets");
  for (const p of PRESETS) {
    const b = el("button", "tm-chip"); b.type = "button";
    const dot = el("i"); dot.style.background = "linear-gradient(135deg, #" + p.c.bg + " 50%, #" + p.c.green + " 50%)";
    b.append(dot, document.createTextNode(p.name));
    // It takes the preset's name too, unless they have typed one of their own.
    b.addEventListener("click", () => {
      applyMain(p.c, p.look);
      if (!state.name || PRESETS.some((q) => q.name === state.name)) state.name = p.name;
      changed();
    });
    chips.append(b);
  }
  const dice = el("button", "tm-chip"); dice.type = "button";
  const d = el("i"); d.style.background = "conic-gradient(#ff7ac8, #ffd166, #6ee7b7, #7ec8e3, #b79cff, #ff7ac8)";
  dice.append(d, document.createTextNode("Surprise me"));
  dice.addEventListener("click", () => { randomTheme(); changed(); });
  chips.append(dice);

  const boards = $("tm-boards");
  for (const b of ["pager", "tdeck"].filter((x) => META.boards[x])) {
    const t = el("button", "", BOARD_NAME[b] || b); t.type = "button"; t.dataset.board = b; t.setAttribute("role", "tab");
    t.addEventListener("click", () => { state.board = b; changed(); });
    boards.append(t);
  }
  const name = $("tm-name");
  name.addEventListener("input", () => {
    const v = typedName(name.value);
    if (v !== name.value) name.value = v;
    state.name = v;
    $("tm-count").textContent = v.length + "/" + NAME_LEN;
    save();
  });
  $("tm-copy").addEventListener("click", async () => {
    const link = shareLink(), b = $("tm-copy");
    try { await navigator.clipboard.writeText(link); b.textContent = "Copied"; }
    catch (e) { history.replaceState(null, "", link); b.textContent = "It is in the address bar"; }
    setTimeout(() => { b.textContent = "Copy a link to this theme"; }, 2600);
  });
  $("tm-reset").addEventListener("click", () => {
    state.touched = false; state.name = ""; state.manual.clear();
    setLook(state.look);
    history.replaceState(null, "", location.pathname);
    changed();
  });
  window.addEventListener("hashchange", () => { if (fromHash()) changed(); });
}

/* ---- the device, over USB ------------------------------------------------------------ */
const usb = { port: null, reader: null, open: false, buf: "", total: 0, dev: null, themes: [], active: -1, max: 4, busy: false, idle: 0 };
const ESPRESSIF = 0x303a;                        // both boards' own USB
const OPENED = "squatch-usb-opened";
const START_MS = 22000;                          // how long a restart takes, with room
const IDLE_MS = 180000;                          // let go of the port after this long with nothing to do
const supported = !!(navigator.serial && window.isSecureContext);

function status(kind, head, note) {
  const box = $("tm-status");
  box.hidden = false;
  box.className = "tm-status " + kind;
  $("tm-status-head").textContent = head;
  $("tm-status-note").textContent = note || "";
}
function logLine(s) {
  const pre = $("tm-log-pre");
  $("tm-log").hidden = false;
  pre.textContent = (pre.textContent + s + "\n").slice(-6000);
  pre.scrollTop = pre.scrollHeight;
}
const deviceWord = () => (usb.dev ? (usb.dev.board === "t-deck" ? "T-Deck" : "pager") : "device");

async function pump() {
  // Everything it says is read, always: a port left open and unread makes the device
  // wait on its own log lines.
  const dec = new TextDecoder();
  let carry = "";
  try {
    for (;;) {
      const { value, done } = await usb.reader.read();
      if (done) break;
      const text = dec.decode(value, { stream: true });
      usb.buf = (usb.buf + text).slice(-40000);
      usb.total += text.length;
      carry += text;
      let i;
      while ((i = carry.indexOf("\n")) >= 0) {
        const line = carry.slice(0, i).replace(/\r/g, "");
        carry = carry.slice(i + 1);
        if (/^\[(status|themes?|theme-[a-z]+)\]/.test(line)) logLine(line);
      }
    }
  } catch (e) { /* unplugged, or closed under us */ }
  usb.open = false;
}

async function closePort(why) {
  clearTimeout(usb.idle);
  const port = usb.port, reader = usb.reader;
  usb.port = null; usb.reader = null; usb.open = false;
  if (reader) {
    try { await Promise.race([reader.cancel(), sleep(1000)]); } catch (e) {}
    try { reader.releaseLock(); } catch (e) {}
  }
  if (port) { try { await Promise.race([port.close(), sleep(1500)]); } catch (e) {} }
  $("tm-disconnect").hidden = true;
  if (why) logLine("-- " + why);
}
function stayAwhile() {
  clearTimeout(usb.idle);
  usb.idle = setTimeout(() => {
    if (usb.busy) return stayAwhile();
    closePort("let go of the port after a few quiet minutes");
    status("ok", "Disconnected", "The cable can stay in. Press send to connect again.");
  }, IDLE_MS);
}

async function send(line) {
  const w = usb.port.writable.getWriter();
  try { await Promise.race([w.write(new TextEncoder().encode("\n" + line + "\n")), sleep(1500)]); }
  finally { try { w.releaseLock(); } catch (e) {} }
  logLine("> " + (line.length > 60 ? line.slice(0, 57) + "..." : line));
}
// Send a line and wait for an answer matching mark. every: ask again this often until it
// comes (a device that the open restarted hears nothing while it starts).
async function ask(line, mark, ms, every) {
  const from = usb.total;
  let sentAt = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!usb.open) throw Object.assign(new Error("gone"), { gone: true });
    if (!sentAt || (every && Date.now() - sentAt > every)) { await send(line); sentAt = Date.now(); }
    const fresh = usb.buf.slice(Math.max(0, usb.buf.length - (usb.total - from)));   // what has come since it was asked
    if (mark.test(fresh)) return fresh;
    await sleep(80);
  }
  return "";
}

async function connect() {
  if (usb.open && usb.port) return;
  let port = null;
  const known = (await navigator.serial.getPorts()).filter((p) => { try { return p.getInfo().usbVendorId === ESPRESSIF; } catch (e) { return false; } });
  if (known.length === 1) port = known[0];
  else {
    status("busy", "Pick your device", "Your browser is asking which USB device to use. Choose the pager or T-Deck.");
    port = await navigator.serial.requestPort({ filters: [{ usbVendorId: ESPRESSIF }] });
  }
  // Opening the port restarts the device. A second restart while it is still starting
  // is the one thing to avoid, so wait out the first.
  let last = 0;
  try { last = Number(localStorage.getItem(OPENED)) || 0; } catch (e) {}
  const wait = START_MS - (Date.now() - last);
  if (wait > 0 && wait <= START_MS) {
    status("busy", "One moment", "It was connected a moment ago. Letting it finish starting up first.");
    await sleep(wait);
  }
  try { await port.open({ baudRate: 115200, bufferSize: 16384 }); }
  catch (e) { throw Object.assign(new Error("open"), { wontOpen: true, detail: (e && e.message) || String(e) }); }
  try { localStorage.setItem(OPENED, String(Date.now())); } catch (e) {}
  usb.port = port; usb.open = true; usb.buf = "";
  usb.reader = port.readable.getReader();
  pump();
  $("tm-disconnect").hidden = false;
  logLine("-- connected");

  status("busy", "Saying hello", "Connecting restarts it, so this can take up to half a minute. Leave it plugged in.");
  const st = await ask("status", /\[status\] [^\n]*\n/, 45000, 1500);
  const m = /\[status\] fw=(\S+)[^\n]*/.exec(st);
  if (!m) throw Object.assign(new Error("silent"), { silent: true });
  const board = /\bboard=(\S+)/.exec(m[0]);
  usb.dev = { fw: m[1], board: board ? board[1] : "t-lora-pager" };
  // Show its own screen shape in the preview.
  const shape = usb.dev.board === "t-deck" ? "tdeck" : "pager";
  if (state.board !== shape) { state.board = shape; changed(); }
  await list();
}

async function list() {
  const heard = await ask("themes", /\[themes\] end[^\n]*\n/, 6000, 2500);
  // Asked twice, it answers twice: the last whole answer is the one that counts.
  const whole = heard.match(/\[themes\] v=[\s\S]*?\[themes\] end/g);
  const text = whole ? whole[whole.length - 1] : "";
  const head = /\[themes\] v=(\d+) max=(\d+) active=(\d+) count=(\d+)/.exec(text);
  if (!head) throw Object.assign(new Error("old"), { old: true });
  usb.active = +head[3];
  usb.max = +head[2];
  usb.themes = [];
  const re = /\[theme\] id=(\d+) 1 ([0-3]) ([0-9a-fA-F]{90}) ?([^\r\n]*)/g;
  let t;
  while ((t = re.exec(text))) usb.themes.push({ id: +t[1], look: +t[2], hex: t[3].toLowerCase(), name: t[4] });
  showDevice();
}

function showDevice() {
  const box = $("tm-device"), ul = $("tm-device-list");
  box.hidden = false;
  $("tm-device-head").textContent = "Your own themes on this " + deviceWord() + " (" + usb.themes.length + " of " + (usb.max || 4) + ")";
  ul.textContent = "";
  if (!usb.themes.length) { ul.append(el("li", "tm-empty", "None yet.")); }
  for (const t of usb.themes) {
    const li = el("li");
    const dots = el("span", "tm-dots");
    for (const i of [0, 3, 4, 5, 7]) { const d = el("i"); d.style.background = "#" + t.hex.slice(i * 6, i * 6 + 6); dots.append(d); }
    const name = el("span", "tm-dname", t.name);
    name.append(el("small", "", (usb.active === t.id ? "showing now, " : "") + LOOK_NAMES[t.look] + " look"));
    const edit = el("button", "", "Edit"); edit.type = "button";
    edit.title = "Bring this one into the page to change it";
    edit.addEventListener("click", () => {
      const colours = {};
      KEYS.forEach((k, i) => { colours[k] = t.hex.slice(i * 6, i * 6 + 6); });
      load({ look: t.look, colours, name: t.name, manual: setByHand(colours), touched: true, board: state.board });
      changed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const use = el("button", "", "Show"); use.type = "button";
    use.hidden = usb.active === t.id;
    use.addEventListener("click", () => act("Switching", async () => {
      const r = await ask("theme-use " + t.id, /\[theme-use\] (ok|failed)[^\n]*\n/, 6000, 0);
      if (!/\] ok/.test(r)) throw Object.assign(new Error("no"), { said: r });
      await list();
      status("ok", "Showing “" + t.name + "”", "");
    }));
    const del = el("button", "", "Remove"); del.type = "button";
    del.addEventListener("click", () => act("Removing", async () => {
      const r = await ask("theme-del " + t.id, /\[theme-del\] (ok|failed)[^\n]*\n/, 6000, 0);
      if (!/\] ok/.test(r)) throw Object.assign(new Error("no"), { said: r });
      await list();
      status("ok", "Removed “" + t.name + "”", "It is gone from the " + deviceWord() + ". Your design on this page is untouched.");
    }));
    li.append(dots, name, edit, use, del);
    ul.append(li);
  }
  // The way back to a standard theme, whatever is showing.
  const li = el("li", "tm-empty");
  li.append(el("span", "tm-dname", "Go back to a built-in theme:"));
  LOOK_NAMES.forEach((n, i) => {
    const b = el("button", "", n); b.type = "button";
    b.addEventListener("click", () => act("Switching", async () => {
      const r = await ask("theme-use " + i, /\[theme-use\] (ok|failed)[^\n]*\n/, 6000, 0);
      if (!/\] ok/.test(r)) throw Object.assign(new Error("no"), { said: r });
      await list();
      status("ok", "Showing " + n, "Your own themes are still on it, under Settings → Theme.");
    }));
    li.append(b);
  });
  ul.append(li);
}

// One thing at a time with the device, and every way it can go wrong said plainly.
async function act(doing, job) {
  if (usb.busy) return;
  usb.busy = true;
  const btn = $("tm-send");
  btn.disabled = true;
  document.querySelectorAll("#tm-device-list button").forEach((b) => { b.disabled = true; });
  try {
    await connect();
    status("busy", doing, "");
    await job();
    stayAwhile();
  } catch (e) {
    const where = usb.dev && usb.dev.board === "t-deck" ? "/t-deck" : "/install";
    if (e && e.name === "NotFoundError") status("bad", "Nothing was picked", "No device was chosen, so nothing was sent. Press send when it is plugged in.");
    else if (e && e.wontOpen) status("bad", "Couldn't open its USB port", "Something else is using it: another tab with the installer, a serial monitor, or the MeshCore app over USB. Close that, unplug it and plug it back in, then try again.");
    else if (e && e.silent) { await closePort("no answer"); status("bad", "It didn't answer", "Is it a pager or T-Deck running Squatch Mesh, switched on and past its start-up screen? Unplug it, plug it back in and try again."); }
    else if (e && e.old) {
      await closePort("firmware from before themes");
      const box = $("tm-status");
      status("bad", "It needs an update first", "");
      const note = $("tm-status-note");
      note.textContent = "This " + deviceWord() + " has Squatch Mesh " + (usb.dev ? usb.dev.fw : "") + ", from before your own themes. ";
      const a = el("a", "", "Update it"); a.href = where;
      note.append(a, document.createTextNode(", then come back: your design will still be here."));
      box.className = "tm-status bad";
    }
    else if (e && e.gone) { await closePort("unplugged"); status("bad", "It dropped off USB", "The cable came out, or the device restarted. Plug it back in and press send again."); }
    else if (e && e.said != null) status("bad", "It said no", (/failed: ([^\r\n]*)/.exec(e.said) || [0, "It gave no reason"])[1].replace(/^full.*/, "It already holds four of your own. Remove one below, then send again.") );
    else { status("bad", "That didn't work", (e && e.message) || String(e)); }
  } finally {
    usb.busy = false;
    btn.disabled = false;
    btn.textContent = usb.open ? "Send to my " + deviceWord() : "Send to my device";
    document.querySelectorAll("#tm-device-list button").forEach((b) => { b.disabled = false; });
  }
}

function sendTheme() {
  const name = cleanName(state.name);
  return act("Sending “" + name + "”", async () => {
    const r = await ask("theme-set " + themeLine(), /\[theme-set\] (ok|failed)[^\n]*\n/, 8000, 0);
    if (!r) throw Object.assign(new Error("no"), { said: "failed: it didn't answer. Press send to try once more." });
    if (!/\[theme-set\] ok/.test(r)) throw Object.assign(new Error("no"), { said: r });
    await list();
    status("ok", "“" + name + "” is on your " + deviceWord(),
           "It is showing now, and it is in Settings → Theme with the built-in ones. Change a colour and send again to replace it.");
  });
}

/* ---- start ------------------------------------------------------------------------- */
async function start() {
  try {
    const r = await fetch("/assets/theme/themes.json?v=" + ASSET_V);
    if (!r.ok) throw new Error("themes.json " + r.status);
    META = await r.json();
  } catch (e) { $("tm-failed").hidden = false; return; }
  let kept = null;
  try { kept = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { kept = null; }
  if (!fromHash() && !load(kept)) { state.colours = builtin(0); }
  build();
  $("tm").hidden = false;
  changed();
  if (!supported) {
    $("tm-unsupported").hidden = false;
    $("tm-send").disabled = true;
  } else {
    $("tm-send").addEventListener("click", sendTheme);
    $("tm-disconnect").addEventListener("click", async () => { await closePort("disconnected"); status("ok", "Disconnected", "Press send to connect again."); $("tm-send").textContent = "Send to my device"; });
    navigator.serial.addEventListener("disconnect", (ev) => {
      if (usb.port && ev.target === usb.port) { closePort("unplugged"); status("bad", "It was unplugged", "Plug it back in and press send to carry on."); $("tm-send").textContent = "Send to my device"; }
    });
    // Leaving the page lets go of the port.
    window.addEventListener("pagehide", () => { if (usb.port) closePort(); });
  }
}
start();

// For the page's own tests (tools/theme_atlas.py --lines and the browser checks).
window.__squatchTheme = { state, KEYS, themeLine, cleanName, setColour, setLook, applyMain, load, shareLink, PRESETS, contrast, usb };
