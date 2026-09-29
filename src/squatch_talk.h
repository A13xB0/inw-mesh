// The lock screen's sasquatch talks: a speech bubble over him that reacts to what
// the pager is doing - shaken (he hops), picked up, a message in, plugged in, low,
// held tilted. home.cpp's LockView decides when; this holds what he says and draws
// the bubble. Settings > Display > "sasquatch talks" turns it off.
#pragma once
#include <Arduino.h>
#include "display_config.h"
#include "theme.h"
#include "ui.h"          // L::W

namespace talk {

enum Kind : uint8_t { SHAKE, SHAKE_HARD, SHAKE_AGAIN, MORNING, DAY, EVENING, LATE,
                      MESSAGE, PLUG, LOW_BATT, LEAN, KIND_COUNT };

// A few lines each; he never says the same one twice in a row.
inline const char* line(Kind k, unsigned n = 0) {
  static const char* const SHAKE_L[]  = {"Whoa! Easy!", "Earthquake?!", "I'm up, I'm up!",
                                         "Not the snow globe treatment!", "My fur's all messed up.",
                                         "Did we hit a pothole?", "Was that a moose?"};
  static const char* const HARD_L[]   = {"HEY! Put me down!", "Whoa whoa WHOA!", "I'm getting seasick..."};
  static const char* const AGAIN_L[]  = {"Okay, OKAY! I'm awake!", "I get it, you're bored.",
                                         "One more and I walk home."};
  static const char* const MORN_L[]   = {"Morning!", "Coffee first?", "Rise and shine.", "Early bird, huh?"};
  static const char* const DAY_L[]    = {"Hey there!", "Nice day for a hike.", "Heard anything good?",
                                         "Mesh is humming today."};
  static const char* const EVE_L[]    = {"Evening!", "Good night for a walk.", "Stars are coming out."};
  static const char* const LATE_L[]   = {"Up late?", "Shh... it's late.", "Can't sleep either?", "Night shift, huh?"};
  static const char* const MSG_L[]    = {"You've got mail!", "Someone's talking!", "Ooh, a message!"};
  static const char* const PLUG_L[]   = {"Ooh, snacks!", "Mmm, electrons.", "Charging up!", "Ahh, that's the stuff."};
  static const char* const LOW_L[]    = {"I'm getting sleepy...", "Running on fumes here.", "Feed me? (charge me)"};
  static const char* const LEAN_L[]   = {"Whoa, I'm sliding!", "Level it out!", "Uphill both ways..."};
  struct Set { const char* const* l; uint8_t n; };
  static const Set SETS[KIND_COUNT] = {
    {SHAKE_L, 7}, {HARD_L, 3}, {AGAIN_L, 3}, {MORN_L, 4}, {DAY_L, 4}, {EVE_L, 3}, {LATE_L, 4},
    {MSG_L, 3}, {PLUG_L, 4}, {LOW_L, 3}, {LEAN_L, 3}};
  static uint8_t last[KIND_COUNT];
  static char b[32];
  if (k == MESSAGE && n > 1) { snprintf(b, sizeof(b), "%u new messages!", n); return b; }
  const Set& s = SETS[k];
  uint8_t i = (uint8_t)random(s.n);
  if (s.n > 1 && i == last[k]) i = (i + 1) % s.n;
  last[k] = i;
  return s.l[i];
}

// Just above the character's head in each lock scene (scenes.h), lift px off the
// ground mid-hop: where the bubble's tail points.
inline void anchor(uint8_t style, int lift, int& ax, int& ay) {
  switch (style) {
    case STYLE_BLOCKS: ax = 241; ay = 70; break;           // the explorer (his ground varies)
    case STYLE_HERO:   ax = 238; ay = 86; break;           // the adventurer
    case STYLE_AURORA: ax = 266; ay = 90 - lift; break;    // the sasquatch, 80 px tall
    default:           ax = 268; ay = 82 - lift; break;    // INW: the sasquatch, 88 px tall
  }
}

// The bubble, its tail pointing at (ax, ay) - just above his head. It pops in over
// the first ~0.16 s (grow 0..1) and the words appear once it's full size.
inline void bubble(lgfx::LovyanGFX& d, const Theme& t, int ax, int ay, const char* text, float grow) {
  d.setFont(&fonts::Font2);
  const int fullW = d.textWidth(text) + 18, fullH = 22;
  const float g = grow < 0.35f ? 0.35f : (grow > 1 ? 1 : grow);
  const int w = (int)(fullW * g), h = (int)(fullH * g);
  // Up and to the right of him: he faces right, so that's where the words come out.
  int bx = ax + 4;
  if (bx + fullW > L::W - 4) bx = L::W - 4 - fullW;
  int by = ay - 10 - fullH;
  if (by < 21) by = 21;                              // clear of the status bar
  const int x0 = bx, y0 = by + fullH - h;            // grows out of its lower left corner
  const uint16_t fill = t.txt, edge = t.green;
  const int tb = x0 + 8;                             // the tail's base on the bubble's bottom
  d.fillTriangle(tb, y0 + h - 1, tb + 9, y0 + h - 1, ax + 2, ay, fill);
  d.fillRoundRect(x0, y0, w, h, 8, fill);
  d.drawRoundRect(x0, y0, w, h, 8, edge);
  d.drawLine(tb, y0 + h - 1, ax + 2, ay, edge);
  d.drawLine(tb + 9, y0 + h - 1, ax + 2, ay, edge);
  d.drawFastHLine(tb + 1, y0 + h - 1, 8, fill);      // opens the bubble into its tail
  if (g >= 1.0f) {
    d.setTextColor(t.bg, fill);
    d.drawString(text, x0 + 9, y0 + 4);
  }
}

}  // namespace talk
