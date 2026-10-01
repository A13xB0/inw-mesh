/* A stand-in pager or T-Deck for trying /theme-maker's USB side without one plugged in.

   Paste into the page's console (or run with the preview tools), then press the page's
   send button:

       __fakeDevice({ board: "t-deck", fw: "1.2.4-beta4", startMs: 2500, themes: true })

   It behaves as the firmware does (src/main.cpp themeCommand, src/theme_custom.h):
   opening the port "restarts" it, so it hears nothing for startMs; then it answers
   status, themes, theme-set, theme-del and theme-use. themes: false makes it firmware
   from before themes (it ignores those lines). silent: true makes it say nothing at all. */
window.__fakeDevice = function (opt) {
  opt = Object.assign({ board: "", fw: "1.2.6", startMs: 2500, themes: true, silent: false, held: [] }, opt || {});
  const dev = { held: opt.held.slice(), active: 0, opens: 0, heard: [], closes: 0 };
  const enc = new TextEncoder(), dec = new TextDecoder();
  const clean = (s) => {
    let out = "", space = false;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === " " || ch === "\t") { space = out.length > 0; continue; }
      if (space) { out += " "; space = false; if (out.length >= 20) break; }
      out += c < 0x20 || c > 0x7e ? "?" : ch;
      if (out.length >= 20) break;
    }
    return out.replace(/ +$/, "") || "My theme";
  };
  const port = {
    readable: null, writable: null,
    getInfo() { return { usbVendorId: 0x303a, usbProductId: 0x1001 }; },
    async open() {
      dev.opens++;
      let ctrl, carry = "";
      const upAt = Date.now() + opt.startMs;
      const say = (line) => { if (!opt.silent) try { ctrl.enqueue(enc.encode(line + "\r\n")); } catch (e) {} };
      port.readable = new ReadableStream({ start(c) { ctrl = c; } });
      setTimeout(() => { say("[INW] boot " + opt.fw); say("[boot] took 11092ms total"); }, opt.startMs);
      const handle = (line) => {
        if (Date.now() < upAt) return;                 // still starting: nothing is listening
        dev.heard.push(line);
        if (line === "status") return say("[status] fw=" + opt.fw + " radio=SX1262 radio_ok=1 contacts=12" + (opt.board ? " board=" + opt.board : ""));
        if (!opt.themes) return;
        if (line === "themes") {
          say("[themes] v=1 max=4 active=" + dev.active + " count=" + dev.held.filter(Boolean).length);
          dev.held.forEach((t, i) => { if (t) say("[theme] id=" + (16 + i) + " 1 " + t.look + " " + t.hex + " " + t.name); });
          return say("[themes] end");
        }
        let m = /^theme-set 1 ([0-3]) ([0-9a-fA-F]{90})(?: (.*))?$/.exec(line);
        if (line.startsWith("theme-set ")) {
          if (!m) return say("[theme-set] failed: colours cut short or not hex");
          const name = clean(m[3] || "");
          let slot = dev.held.findIndex((t) => t && t.name.toLowerCase() === name.toLowerCase());
          if (slot < 0) slot = [0, 1, 2, 3].find((i) => !dev.held[i]);
          if (slot === undefined || slot < 0) return say("[theme-set] failed: full: it already has four of your own, take one off first");
          dev.held[slot] = { look: +m[1], hex: m[2].toLowerCase(), name };
          dev.active = 16 + slot;
          return say("[theme-set] ok id=" + (16 + slot) + " name=" + name);
        }
        m = /^theme-(del|use) (\d+)$/.exec(line);
        if (m) {
          const id = +m[2], own = id >= 16 && id < 20 && dev.held[id - 16];
          if (m[1] === "use") {
            if (!(id < 4 || own)) return say("[theme-use] failed: no such theme");
            dev.active = id;
            return say("[theme-use] ok id=" + id);
          }
          if (!own) return say("[theme-del] failed: no such theme");
          const look = dev.held[id - 16].look;
          dev.held[id - 16] = null;
          if (dev.active === id) dev.active = look;
          return say("[theme-del] ok id=" + id + " active=" + dev.active);
        }
      };
      port.writable = new WritableStream({
        write(chunk) {
          carry += dec.decode(chunk, { stream: true });
          let i;
          while ((i = carry.indexOf("\n")) >= 0) { const line = carry.slice(0, i).replace(/\r/g, ""); carry = carry.slice(i + 1); if (line) handle(line); }
        },
      });
      port._close = () => { try { ctrl.close(); } catch (e) {} };
    },
    async close() { dev.closes++; if (port._close) port._close(); port.readable = null; port.writable = null; },
  };
  const serial = {
    async getPorts() { return opt.known === false ? [] : [port]; },
    async requestPort() { dev.asked = (dev.asked || 0) + 1; return port; },
    addEventListener() {},
  };
  Object.defineProperty(navigator, "serial", { value: serial, configurable: true });
  try { localStorage.removeItem("squatch-usb-opened"); } catch (e) {}
  window.__fake = dev;
  return dev;
};
